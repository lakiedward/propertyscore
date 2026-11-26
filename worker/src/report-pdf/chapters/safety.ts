import type { ChapterBuilder } from '../chapter.ts';
import {
  categoryEyebrow,
  chapter,
  chapterHead,
  chapterSources,
  footnote,
  iconTile,
  scoreCard,
  sourceDate,
} from '../components.ts';
import { heatRaster } from '../heat-grid.ts';
import { esc, walkMinutes, reportFormat, labelFor } from '../format.ts';
import { icon, type IconName } from '../icons.ts';
import { HEALTH_LAYERS, safetyType } from '../labels.ts';
import { addressMarker, mapHtml, around, type MapSpec } from '../maps.ts';
import type { ReportData, ReportLocale } from '../report-data.ts';
import { CATEGORY_THEME, categoryTheme, SAFETY_HEAT_OPACITY, SAFETY_HEAT_RAMP } from '../theme.ts';

type Safety = NonNullable<ReportData['sections']['safety']>;
type Moment = Safety['address']['day'];
type Contribution = Moment['contributions'][number];
type HelpRow = {
  icon: IconName;
  color: string;
  title: string;
  name: string | null;
  metres: number | null;
  value: string;
  detail: string;
};

const MAP_REACH_M = 650;
const HEAT_HALF_WIDTH_M = 1900;
const HEAT_HALF_HEIGHT_M = 1200;
const HEAT_STEP_M = 25;
const WALKABLE_M = 1500;
const BAR_HEADROOM = 1.08;
const HELP_LANDMARKS = ['nonstop', 'police', 'fire_station'];
const HELP_LAYERS: Record<string, { icon: IconName; color: string }> = {
  h5: { icon: 'pill', color: '#0F766E' },
  h4: { icon: 'heart', color: '#B4235A' },
};

function contributionRow(locale: ReportLocale, item: Contribution): string {
  const { t, formatDistance, formatNumber } = reportFormat(locale);
  const type = safetyType(locale, item.type);
  const nearest =
    item.nearest_m === null
      ? ''
      : t(' · cel mai aproape la {0}', ' · closest at {0}', formatDistance(item.nearest_m));
  const points = Math.round(item.points);
  return `<div class="sfrow${points < 0 ? ' neg' : ''}" style="--c:${type.color}"><span class="sfi" style="--c:${type.color}">${icon(type.icon)}</span><span class="tx"><b>${esc(type.label)}</b><small>${t('{0} în jur{1}', '{0} nearby{1}', formatNumber(item.count), nearest)}</small></span><span class="p">${points < 0 ? '−' : '+'}${String(Math.abs(points))}</span></div>`;
}

function farTypes(locale: ReportLocale, safety: Safety, moment: Moment): string {
  const { t, formatDistance } = reportFormat(locale);
  const far = moment.far_types.map((type) => {
    const nearest = safety.landmarks
      .filter((landmark) => landmark.type === type)
      .sort((left, right) => left.distance_m - right.distance_m)[0];
    const label = safetyType(locale, type).label.toLowerCase();
    return nearest ? `${label} (${formatDistance(nearest.distance_m)})` : label;
  });
  if (far.length === 0) return '';
  return `<p class="sffar">${icon('info')}<span><b>${t('Prea departe ca să conteze:', 'Too far away to count:')}</b>${t(' {0}. Le arătăm pe hartă, dar nu schimbă scorul.', ' {0}. We show them on the map, but they do not affect the score.', esc(far.join(', ')))}</span></p>`;
}

function waterfall(locale: ReportLocale, safety: Safety, moment: Moment, when: string): string {
  const { t } = reportFormat(locale);
  const start = Math.round(safety.address.start);
  const score = Math.round(moment.score);
  const counted = moment.contributions.filter((item) => Math.round(item.points) !== 0);
  const raises = counted.filter((item) => item.points > 0);
  const lowers = counted.filter((item) => item.points < 0);
  const up = raises.reduce((sum, item) => sum + Math.round(item.points), 0);
  const down = lowers.reduce((sum, item) => sum - Math.round(item.points), 0);
  const kept = Math.max(0, score - start);
  const color = CATEGORY_THEME.safety.color;
  const bar = `<div class="sfwf"><i style="flex:${String(start)};background:#D9DDC9"></i><i style="flex:${String(kept)};background:${color}"></i><i class="lost" style="flex:${String(down)}"></i><i style="flex:${String(Math.max(0, 100 - start - kept - down))};background:transparent"></i></div>`;
  const equation = `<p class="sfeq"><b>${String(start)}</b>${t(' punct de pornire ', ' starting score ')}<b class="u">+${String(up)}</b>${t(' ce ridică ', ' increases ')}<b class="d">−${String(down)}</b>${t(' ce coboară = ', ' decreases = ')}<b>${String(score)}</b></p>`;
  const column = (title: string, tone: string, items: readonly Contribution[]) =>
    `<div><div class="sfh ${tone}">${icon('up')}${title}</div>${items.length === 0 ? `<p class="sfsrc">${t('Nimic din jur.', 'Nothing nearby.')}</p>` : items.map((item) => contributionRow(locale, item)).join('')}</div>`;
  return `<div class="sfwfc"><h3>${t('De ce are adresa {0} {1}', 'Why the address scores {0} {1}', String(score), when)}</h3>${bar}${equation}<div class="sfcols">${column(t('Ce ridică scorul', 'What raises the score'), 'u', raises)}${column(t('Ce coboară scorul', 'What lowers the score'), 'd', lowers)}</div>${farTypes(locale, safety, moment)}</div>`;
}

function heatLayers(safety: Safety, center: [number, number]): MapSpec['layers'] {
  if (!safety.heat || safety.heat.cells.length === 0) return [];
  const raster = heatRaster(
    safety.heat.cells.map(([longitude, latitude, day]) => [longitude, latitude, day] as const),
    {
      center,
      halfWidthM: HEAT_HALF_WIDTH_M,
      halfHeightM: HEAT_HALF_HEIGHT_M,
      stepM: HEAT_STEP_M,
      cellSizeM: safety.heat.cell_size_m,
      ramp: SAFETY_HEAT_RAMP,
      opacity: SAFETY_HEAT_OPACITY,
    },
  );
  return [{ kind: 'image', ...raster }];
}

function heatGradient(): string {
  const first = SAFETY_HEAT_RAMP[0][0];
  const span = (SAFETY_HEAT_RAMP.at(-1)?.[0] ?? 100) - first;
  const stops = SAFETY_HEAT_RAMP.map(
    ([score, [red, green, blue]]) =>
      `rgb(${String(red)},${String(green)},${String(blue)}) ${String(Math.round(((score - first) / span) * 100))}%`,
  );
  return `linear-gradient(90deg,${stops.join(',')})`;
}

function heatLegend(locale: ReportLocale): string {
  const { t } = reportFormat(locale);
  return `<span class="sfleg-t"><b>${t('Hartă termică', 'Heat map')}</b><span>${t('mai puțin sigur', 'less safe')}</span><i class="sframp" style="--ramp:${heatGradient()}"></i><span>${t('mai sigur', 'safer')}</span></span>`;
}

function helpRows(report: ReportData, safety: Safety): HelpRow[] {
  const { t, formatDistance, formatMinutes } = reportFormat(report.locale);
  const landmarks = HELP_LANDMARKS.flatMap((type) => {
    const nearest = safety.landmarks
      .filter((landmark) => landmark.type === type)
      .sort((left, right) => left.distance_m - right.distance_m)[0];
    if (!nearest) return [];
    const meta = safetyType(report.locale, type);
    const walkable = nearest.distance_m <= WALKABLE_M;
    return [
      {
        icon: meta.icon,
        color: meta.color,
        title: type === 'nonstop' ? t('Magazin non-stop', '24-hour shop') : meta.label,
        name: nearest.name,
        metres: nearest.distance_m,
        value: formatDistance(nearest.distance_m),
        detail: walkable
          ? t('{0} pe jos', '{0} on foot', formatMinutes(walkMinutes(nearest.distance_m)))
          : t('cu mașina', 'by car'),
      },
    ];
  });
  const medical = (report.sections.health?.layers ?? []).flatMap((layer) => {
    const meta = HELP_LAYERS[layer.key];
    if (!meta || layer.minutes === null) return [];
    return [
      {
        icon: meta.icon,
        color: meta.color,
        title: labelFor(report.locale, HEALTH_LAYERS, layer.key),
        name: layer.place?.name ?? null,
        metres: null,
        value: formatMinutes(layer.minutes),
        detail: layer.mode === 'car' ? t('cu mașina', 'by car') : t('pe jos', 'on foot'),
      },
    ];
  });
  return [...landmarks, ...medical];
}

function helpCard(locale: ReportLocale, rows: readonly HelpRow[]): string {
  const { t } = reportFormat(locale);
  if (rows.length === 0) return '';
  const longest = Math.max(...rows.map((row) => row.metres ?? 0), 1) * BAR_HEADROOM;
  const items = rows
    .map((row) => {
      const bar =
        row.metres === null
          ? '<span class="xs1-b none"></span>'
          : `<span class="xs1-b"><i style="width:${Math.max(2, (row.metres / longest) * 100).toFixed(1)}%"></i></span>`;
      return `<li class="xs1-r" style="--c:${row.color}"><span class="xs1-i">${icon(row.icon)}</span><span class="xs1-t"><b>${esc(row.title)}</b><small>${esc(row.name ?? '')}</small></span>${bar}<span class="xs1-d"><b>${esc(row.value)}</b><small>${esc(row.detail)}</small></span></li>`;
    })
    .join('');
  return `<section class="card xs xs1"><div class="xs-h"><div><div class="eyebrow">${t('Dacă ai nevoie de ajutor', 'If you need help')}</div><h3>${t('Cât de departe e ajutorul', 'How far away is help?')}</h3></div><span class="xs1-112">${icon('phone')}<span>${t('Urgențe ', 'Emergencies ')}<b>112</b></span></span></div><ol class="xs1-l">${items}</ol></section>`;
}

export const safetyChapter: ChapterBuilder = (report) => {
  const { t } = reportFormat(report.locale);
  const summary = report.categories.safety;
  const safety = report.sections.safety;
  const theme = categoryTheme(report.locale, 'safety');
  const head = chapterHead(report.locale, {
    eyebrow: categoryEyebrow(report.locale, 'safety', summary),
    color: theme.color,
    precision: theme.precision,
    title: t(
      'Lumină, magazine deschise și lume pe stradă în jurul adresei',
      'Lighting, open shops and people on the street around the address',
    ),
    lead: safety
      ? t(
          'Ziua adresa are {0}, noaptea {1}. Mai jos e fiecare element din jur pe care l-am luat în calcul: felinare, magazine, non-stop, poliție, pompieri, baruri, parcuri, pasaje.',
          'The address scores {0} by day and {1} at night. Below are the features we considered: street lights, shops, 24-hour shops, police, fire stations, bars, parks and underpasses.',
          String(Math.round(safety.day)),
          String(Math.round(safety.night)),
        )
      : undefined,
  });
  if (!safety) {
    return {
      html: chapter(head + scoreCard('safety', report) + chapterSources(report, ['safety'])),
      maps: [],
    };
  }
  const center: [number, number] = [report.longitude, report.latitude];
  const shown = [...new Set(safety.landmarks.map((landmark) => landmark.type))];
  const map: MapSpec = {
    id: 'map-safety',
    center,
    fit: around(center, MAP_REACH_M),
    padding: 0,
    layers: heatLayers(safety, center),
    markers: [
      ...safety.landmarks.map((landmark) => {
        const type = safetyType(report.locale, landmark.type);
        return {
          position: landmark.location,
          html: iconTile(type.icon, type.color, '#fff', 'sfmk'),
        };
      }),
      addressMarker(center, report.addressText.split(',')[0]),
    ],
  };
  const moments = `<div class="seg sfseg"><span class="on">${t('{0}Ziua ', '{0}Day ', icon('sun'))}<b>${String(Math.round(safety.day))}</b></span><span>${t('{0}Noaptea ', '{0}Night ', icon('moon'))}<b>${String(Math.round(safety.night))}</b></span></div>`;
  const hasHeat = (safety.heat?.cells.length ?? 0) > 0;
  const heatChip = hasHeat
    ? `<span class="sfc sfc-h"><i class="sframp sm" style="--ramp:${heatGradient()}"></i>${t('Hartă termică', 'Heat map')}</span>`
    : '';
  const typeChips = shown
    .map((key) => {
      const type = safetyType(report.locale, key);
      return `<span class="sfc" style="--c:${type.color}"><span class="sfci">${icon(type.icon)}</span>${esc(type.label)}</span>`;
    })
    .join('');
  const chips = heatChip + typeChips;
  const legend = chips
    ? `<div class="sfov-leg">${hasHeat ? `<div class="sfleg">${heatLegend(report.locale)}</div>` : ''}<div class="sfchips">${chips}</div></div>`
    : '';
  const osm = sourceDate(report, 'osm');
  const body = `<section class="sfW"><div class="sfmap sfW-m">${mapHtml(report.locale, map, `<div class="sfov-top">${moments}</div>${legend}`)}</div><div class="sfW-wf">${waterfall(report.locale, safety, safety.address.day, t('ziua', 'by day'))}${waterfall(report.locale, safety, safety.address.night, t('noaptea', 'at night'))}</div>${footnote(t('Elementele de pe hartă sunt din OpenStreetMap{0}.', 'The features on the map are from OpenStreetMap{0}.', osm ? t(' (extras din {0})', ' (extracted on {0})', osm) : ''))}</section>`;
  return {
    html: chapter(
      `${head}${body}<div class="sfB-rest">${scoreCard('safety', report)}${helpCard(report.locale, helpRows(report, safety))}${chapterSources(report, ['safety'])}</div>`,
      'sfBch',
    ),
    maps: [map],
  };
};
