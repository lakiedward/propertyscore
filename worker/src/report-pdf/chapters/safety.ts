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
import { esc, formatDistance, formatMinutes, formatNumber, walkMinutes } from '../format.ts';
import { icon, type IconName } from '../icons.ts';
import { HEALTH_LAYERS, safetyType } from '../labels.ts';
import { addressMarker, mapHtml, around, type MapSpec } from '../maps.ts';
import type { ReportData } from '../report-data.ts';
import { CATEGORY_THEME } from '../theme.ts';

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
const WALKABLE_M = 1500;
const BAR_HEADROOM = 1.08;
const HELP_LANDMARKS = ['nonstop', 'police', 'fire_station'];
const HELP_LAYERS: Record<string, { icon: IconName; color: string }> = {
  h5: { icon: 'pill', color: '#0F766E' },
  h4: { icon: 'heart', color: '#B4235A' },
};

function contributionRow(item: Contribution): string {
  const type = safetyType(item.type);
  const nearest =
    item.nearest_m === null ? '' : ` · cel mai aproape la ${formatDistance(item.nearest_m)}`;
  const points = Math.round(item.points);
  return `<div class="sfrow${points < 0 ? ' neg' : ''}" style="--c:${type.color}"><span class="sfi" style="--c:${type.color}">${icon(type.icon)}</span><span class="tx"><b>${esc(type.label)}</b><small>${formatNumber(item.count)} în jur${nearest}</small></span><span class="p">${points < 0 ? '−' : '+'}${String(Math.abs(points))}</span></div>`;
}

function farTypes(safety: Safety, moment: Moment): string {
  const far = moment.far_types.map((type) => {
    const nearest = safety.landmarks
      .filter((landmark) => landmark.type === type)
      .sort((left, right) => left.distance_m - right.distance_m)[0];
    const label = safetyType(type).label.toLocaleLowerCase('ro-RO');
    return nearest ? `${label} (${formatDistance(nearest.distance_m)})` : label;
  });
  if (far.length === 0) return '';
  return `<p class="sffar">${icon('info')}<span><b>Prea departe ca să conteze:</b> ${esc(far.join(', '))}. Le arătăm pe hartă, dar nu schimbă scorul.</span></p>`;
}

function waterfall(safety: Safety, moment: Moment, when: string): string {
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
  const equation = `<p class="sfeq"><b>${String(start)}</b> punct de pornire <b class="u">+${String(up)}</b> ce ridică <b class="d">−${String(down)}</b> ce coboară = <b>${String(score)}</b></p>`;
  const column = (title: string, tone: string, items: readonly Contribution[]) =>
    `<div><div class="sfh ${tone}">${icon('up')}${title}</div>${items.length === 0 ? '<p class="sfsrc">Nimic din jur.</p>' : items.map(contributionRow).join('')}</div>`;
  return `<div class="sfwfc"><h3>De ce are adresa ${String(score)} ${when}</h3>${bar}${equation}<div class="sfcols">${column('Ce ridică scorul', 'u', raises)}${column('Ce coboară scorul', 'd', lowers)}</div>${farTypes(safety, moment)}</div>`;
}

function helpRows(report: ReportData, safety: Safety): HelpRow[] {
  const landmarks = HELP_LANDMARKS.flatMap((type) => {
    const nearest = safety.landmarks
      .filter((landmark) => landmark.type === type)
      .sort((left, right) => left.distance_m - right.distance_m)[0];
    if (!nearest) return [];
    const meta = safetyType(type);
    const walkable = nearest.distance_m <= WALKABLE_M;
    return [
      {
        icon: meta.icon,
        color: meta.color,
        title: type === 'nonstop' ? 'Magazin non-stop' : meta.label,
        name: nearest.name,
        metres: nearest.distance_m,
        value: formatDistance(nearest.distance_m),
        detail: walkable ? `${formatMinutes(walkMinutes(nearest.distance_m))} pe jos` : 'cu mașina',
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
        title: HEALTH_LAYERS[layer.key] ?? layer.key,
        name: layer.place?.name ?? null,
        metres: null,
        value: formatMinutes(layer.minutes),
        detail: layer.mode === 'car' ? 'cu mașina' : 'pe jos',
      },
    ];
  });
  return [...landmarks, ...medical];
}

function helpCard(rows: readonly HelpRow[]): string {
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
  return `<section class="card xs xs1"><div class="xs-h"><div><div class="eyebrow">Dacă ai nevoie de ajutor</div><h3>Cât de departe e ajutorul</h3></div><span class="xs1-112">${icon('phone')}<span>Urgențe <b>112</b></span></span></div><ol class="xs1-l">${items}</ol></section>`;
}

export const safetyChapter: ChapterBuilder = (report) => {
  const summary = report.categories.safety;
  const safety = report.sections.safety;
  const theme = CATEGORY_THEME.safety;
  const head = chapterHead({
    eyebrow: categoryEyebrow('safety', summary),
    color: theme.color,
    precision: theme.precision,
    title: 'Lumină, magazine deschise și lume pe stradă în jurul adresei',
    lead: safety
      ? `Ziua adresa are ${String(Math.round(safety.day))}, noaptea ${String(Math.round(safety.night))}. Mai jos e fiecare element din jur pe care l-am luat în calcul: felinare, magazine, non-stop, poliție, pompieri, baruri, parcuri, pasaje.`
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
    layers: [],
    markers: [
      ...safety.landmarks.map((landmark) => {
        const type = safetyType(landmark.type);
        return {
          position: landmark.location,
          html: iconTile(type.icon, type.color, '#fff', 'sfmk'),
        };
      }),
      addressMarker(center, report.addressText.split(',')[0]),
    ],
  };
  const moments = `<div class="seg sfseg"><span class="on">${icon('sun')}Ziua <b>${String(Math.round(safety.day))}</b></span><span>${icon('moon')}Noaptea <b>${String(Math.round(safety.night))}</b></span></div>`;
  const chips = shown
    .map((key) => {
      const type = safetyType(key);
      return `<span class="sfc" style="--c:${type.color}"><span class="sfci">${icon(type.icon)}</span>${esc(type.label)}</span>`;
    })
    .join('');
  const legend = chips
    ? `<div class="sfov-leg"><div class="sfleg"><div class="sfchips">${chips}</div></div></div>`
    : '';
  const osm = sourceDate(report, 'osm');
  const body = `<section class="sfW"><div class="sfmap sfW-m">${mapHtml(map, `<div class="sfov-top">${moments}</div>${legend}`)}</div><div class="sfW-wf">${waterfall(safety, safety.address.day, 'ziua')}${waterfall(safety, safety.address.night, 'noaptea')}</div>${footnote(`Elementele de pe hartă sunt din OpenStreetMap${osm ? ` (extras din ${osm})` : ''}.`)}</section>`;
  return {
    html: chapter(
      `${head}${body}<div class="sfB-rest">${scoreCard('safety', report)}${helpCard(helpRows(report, safety))}${chapterSources(report, ['safety'])}</div>`,
      'sfBch',
    ),
    maps: [map],
  };
};
