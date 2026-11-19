import type { ChapterBuilder } from '../chapter.ts';
import { chapter, chapterHead, footnote } from '../components.ts';
import { esc, formatNumber, plural } from '../format.ts';
import { icon } from '../icons.ts';
import { CITY_NAMES, SEISMIC_LEVELS } from '../labels.ts';
import { addressDot, mapHtml, type MapMarker, type MapSpec } from '../maps.ts';
import type { ReportData } from '../report-data.ts';
import { CONTEXT_THEME } from '../theme.ts';

type Seismic = NonNullable<ReportData['sections']['seismic']>;
type Earthquakes = NonNullable<Seismic['earthquakes']>;

const COLOR = CONTEXT_THEME.seismic.color;
const LISTED_EARTHQUAKES = 6;
const SCALE_MIN_G = 0.05;
const SCALE_SPAN_G = 0.3;
const LEVEL_FILLS: Record<string, string> = {
  low: '#DCEBD3',
  moderate: '#EFE3D4',
  high: '#E2C9A8',
  very_high: '#C99A74',
};
const SCALE_BANDS = [
  { from: 0, to: 16.67, level: 'low' },
  { from: 16.67, to: 50, level: 'moderate' },
  { from: 50, to: 83.33, level: 'high' },
  { from: 83.33, to: 100, level: 'very_high' },
];
const CONCLUSIONS: Record<string, { title: string; body: string }> = {
  low: {
    title: 'Pe scurt: risc scăzut',
    body: 'Codul seismic cere aici cea mai mică accelerație de proiectare din țară. Contează în continuare cât de bine e construit și întreținut blocul.',
  },
  moderate: {
    title: 'Pe scurt: risc moderat, nu ridicat',
    body: 'Zona e la mijlocul scalei din codul seismic. Cutremurele mari ale țării vin din Vrancea și ajung aici slăbite. Ce contează mai departe e cât de bine e construit și întreținut blocul.',
  },
  high: {
    title: 'Pe scurt: risc ridicat',
    body: 'Zona e în partea de sus a scalei din codul seismic. Cere anul construcției, expertiza tehnică și dacă blocul a fost consolidat.',
  },
  very_high: {
    title: 'Pe scurt: risc foarte ridicat',
    body: 'Zona are cea mai mare accelerație de proiectare din codul seismic. Cere anul construcției, expertiza tehnică, clasa de risc seismic și dacă blocul a fost consolidat.',
  },
};
const MONTHS = [
  'ianuarie',
  'februarie',
  'martie',
  'aprilie',
  'mai',
  'iunie',
  'iulie',
  'august',
  'septembrie',
  'octombrie',
  'noiembrie',
  'decembrie',
];

function acceleration(value: number): string {
  return `${formatNumber(value, 2)} g`;
}

function longDate(isoDate: string): string {
  const [year = '', month = '1', day = '1'] = isoDate.split('-');
  return `${String(Number(day))} ${MONTHS[Number(month) - 1] ?? ''} ${year}`;
}

type Earthquake = Earthquakes['events'][number];

const SHARED_LABEL_KM = 4;
const KM_PER_DEGREE = 111.2;

function kilometresApart(left: Earthquake, right: Earthquake): number {
  const latitude = ((left.location[1] + right.location[1]) / 2) * (Math.PI / 180);
  const dx = (left.location[0] - right.location[0]) * Math.cos(latitude);
  const dy = left.location[1] - right.location[1];
  return Math.hypot(dx, dy) * KM_PER_DEGREE;
}

function markerLabels(top: readonly Earthquake[]): Map<Earthquake, string> {
  const ranks = new Map<Earthquake, number[]>();
  top.forEach((event, index) => {
    const anchor = [...ranks.keys()].find(
      (kept) => kilometresApart(kept, event) <= SHARED_LABEL_KM,
    );
    if (anchor) ranks.get(anchor)?.push(index + 1);
    else ranks.set(event, [index + 1]);
  });
  const labels = new Map<Earthquake, string>(top.map((event) => [event, '']));
  for (const [event, numbers] of ranks) labels.set(event, numbers.join('·'));
  return labels;
}

function markerHtml(event: Earthquake, label: string | undefined): string {
  const size = `--s:${((event.magnitude - 3) * 14).toFixed(1)}px`;
  if (label === undefined) return `<span class="se-q" style="${size}"></span>`;
  return `<span class="se-q b" style="${size}">${label ? `<b class="se-qn">${label}</b>` : ''}</span>`;
}

function catalogueCredit(earthquakes: Earthquakes): string {
  if (earthquakes.sources.length === 0) return earthquakes.catalogue;
  return earthquakes.sources.map((source) => `${source.name} (${source.license})`).join(' și ');
}

function sourceLinks(earthquakes: Earthquakes): string {
  if (earthquakes.sources.length === 0) return esc(earthquakes.catalogue);
  return earthquakes.sources
    .map((source) => {
      const label = `${esc(source.name)}, ${esc(source.license)}`;
      return source.url ? `<a href="${esc(source.url)}">${label}</a>` : label;
    })
    .join(' · ');
}

function strongest(earthquakes: Earthquakes): Earthquakes['events'] {
  return [...earthquakes.events]
    .sort((left, right) => right.magnitude - left.magnitude || left.distance_km - right.distance_km)
    .slice(0, LISTED_EARTHQUAKES);
}

function conclusionBox(level: string | null, building: Seismic['building']): string {
  const conclusion = level === null ? undefined : CONCLUSIONS[level];
  const year = building
    ? `<p>Anul declarat al construcției: ${String(building.construction_year)}. Întreabă după ce normativ a fost proiectat blocul și dacă are expertiză tehnică.</p>`
    : '';
  if (!conclusion && !year) return '';
  return `<div class="se-concl">${conclusion ? `<b>${esc(conclusion.title)}</b><p>${esc(conclusion.body)}</p>` : ''}${year}</div>`;
}

function scaleCard(seismic: Seismic, report: ReportData): string {
  const values = [...new Set(seismic.comparison.map((city) => city.ag_g))].sort(
    (left, right) => right - left,
  );
  const groups = values.map((value) => ({
    value,
    isHere: value === seismic.ag_g,
    cities: seismic.comparison
      .filter((city) => city.ag_g === value)
      .sort(
        (left, right) =>
          Number(right.slug === report.city.slug) - Number(left.slug === report.city.slug),
      )
      .map((city) => CITY_NAMES[city.slug] ?? city.slug)
      .join(', '),
  }));
  const position = (value: number) =>
    Math.min(100, Math.max(0, ((value - SCALE_MIN_G) / SCALE_SPAN_G) * 100)).toFixed(2);
  const bands = SCALE_BANDS.map(
    (band) =>
      `<i style="left:${String(band.from)}%;width:${(band.to - band.from).toFixed(2)}%;background:${LEVEL_FILLS[band.level] ?? ''}"></i>`,
  ).join('');
  const stops = groups
    .map(
      (group) =>
        `<span class="se-c${group.isHere ? ' me' : ''}" style="left:${position(group.value)}%"><b>${acceleration(group.value)}</b><em>${esc(group.cities)}</em></span>`,
    )
    .join('');
  const scale =
    groups.length < 2
      ? ''
      : `<p class="scv-h">Cum stă ${esc(report.city.name)} față de celelalte ${String(seismic.comparison.length - 1)} orașe</p><div class="se-trk"><div class="se-bar">${bands}</div>${stops}</div>`;
  const pill =
    seismic.level === null
      ? ''
      : `<span class="scv-pill" style="background:${LEVEL_FILLS[seismic.level] ?? '#EFE3D4'}">${esc(SEISMIC_LEVELS[seismic.level] ?? seismic.level)}</span>`;
  return `<section class="card scv scv1 sesc"><div class="scv1-s"><span class="scv-k" style="color:${COLOR}">Seismic</span><span class="scv-big" style="color:${COLOR}">${formatNumber(seismic.ag_g, 2)}<small> g</small></span>${pill}</div><div class="scv1-r">${scale}</div><div class="scvm"><span class="y">${icon('check')}<span><b>Ține cont de</b> accelerația de proiectare din codul seismic ${esc(seismic.code)}</span></span><span class="n">${icon('x')}<span><b>Nu ține cont de</b> starea clădirii și de consolidări</span></span></div></section>`;
}

function earthquakeBlock(
  earthquakes: Earthquakes,
  seismic: Seismic,
  report: ReportData,
): { html: string; map: MapSpec } {
  const center: [number, number] = [report.longitude, report.latitude];
  const top = strongest(earthquakes);
  const labels = markerLabels(top);
  const markers: MapMarker[] = [...earthquakes.events]
    .sort(
      (left, right) =>
        left.magnitude - right.magnitude ||
        Number(Boolean(labels.get(left))) - Number(Boolean(labels.get(right))),
    )
    .map((event) => ({
      position: event.location,
      html: markerHtml(event, labels.get(event)),
    }));
  const map: MapSpec = {
    id: 'map-seismic',
    center,
    fit: [center, ...earthquakes.events.map((event) => event.location)],
    padding: 36,
    layers: [],
    markers: [...markers, addressDot(center)],
  };
  const key = `<div class="gz-key"><span><i class="se-k1"></i>cutremur, cu cât mai mare cercul, cu atât mai puternic</span><span><i class="se-k2"></i>cele mai puternice ${String(top.length)}, cu numărul din listă</span></div>`;
  const list = top
    .map(
      (event, index) =>
        `<li><span class="se-n">${String(index + 1)}</span><span class="se-mb" style="--s:${String(Math.round(26 + (event.magnitude - 4) * 10))}px">${formatNumber(event.magnitude, 1)}</span><span class="zg-src-t"><b>${esc(longDate(event.date))}</b>${event.place ? `<small>lângă ${esc(event.place)}</small>` : ''}</span><span class="zg-src-m"><b>${formatNumber(event.distance_km)}</b> km</span></li>`,
    )
    .join('');
  return {
    map,
    html: `<section class="gzA seA"><div class="gzA-m">${mapHtml(map)}${key}</div><aside class="gzA-p"><div class="eyebrow" style="color:${COLOR}">Din ${String(earthquakes.since_year)} încoace</div><h3>Cele mai puternice cutremure la mai puțin de ${formatNumber(earthquakes.radius_km)} km</h3><ul class="zg-src se-ql-list">${list}</ul>${conclusionBox(seismic.level, seismic.building)}</aside></section>${footnote(`Cutremure: ${catalogueCredit(earthquakes)}, din ${String(earthquakes.since_year)} încoace, magnitudine de cel puțin ${formatNumber(earthquakes.min_magnitude, 1)}${earthquakes.retrieved_on ? `, citite pe ${longDate(earthquakes.retrieved_on)}` : ''}. Hartă: OpenStreetMap.`)}`,
  };
}

export const seismicChapter: ChapterBuilder = (report) => {
  const seismic = report.sections.seismic;
  const eyebrow = 'Risc seismic · context, nu intră în scor';
  if (!seismic) {
    return {
      html: chapter(
        chapterHead({ eyebrow, color: COLOR, title: 'Riscul seismic al zonei' }) +
          footnote('Nu avem valoarea din codul seismic pentru această adresă.'),
      ),
      maps: [],
    };
  }
  const precision = seismic.precision === 'address' ? 'zona adresei' : 'oraș';
  const earthquakes = seismic.earthquakes?.events.length ? seismic.earthquakes : null;
  const biggest = earthquakes ? strongest(earthquakes)[0] : undefined;
  const levelLabel = seismic.level === null ? null : (SEISMIC_LEVELS[seismic.level] ?? null);
  const head =
    earthquakes && biggest
      ? chapterHead({
          eyebrow,
          color: COLOR,
          precision,
          title: `Cel mai puternic cutremur din jur: ${formatNumber(biggest.magnitude, 1)}, în ${biggest.date.slice(0, 4)}`,
          lead: `Din ${String(earthquakes.since_year)} încoace, ${plural(earthquakes.events.length, 'cutremur', 'cutremure', 'de cutremure')} de cel puțin ${formatNumber(earthquakes.min_magnitude, 1)} la mai puțin de ${formatNumber(earthquakes.radius_km)} km de ${report.city.name}.`,
        })
      : chapterHead({
          eyebrow,
          color: COLOR,
          precision,
          title: `Accelerația de proiectare e ${acceleration(seismic.ag_g)}${levelLabel ? `: nivel ${levelLabel.toLocaleLowerCase('ro-RO')}` : ''}`,
          lead: `Valoarea vine din codul seismic ${seismic.code} și arată pentru ce cutremur se proiectează clădirile din ${report.city.name}.`,
        });
  const block = earthquakes ? earthquakeBlock(earthquakes, seismic, report) : null;
  return {
    html: chapter(
      `${head}${block ? block.html : conclusionBox(seismic.level, seismic.building)}<div class="sfB-rest se-rest">${scaleCard(seismic, report)}<div class="how"><div class="how-t">${icon('info')}Surse și date</div><div class="in"><p><b>Surse:</b> Cod seismic ${esc(seismic.code)}${earthquakes ? ` · ${sourceLinks(earthquakes)}` : ''}</p><p><b>Pondere în scorul de zonă:</b> nu intră în scor. E context.</p></div></div></div>`,
    ),
    maps: block ? [block.map] : [],
  };
};
