import type { ChapterBuilder } from '../chapter.ts';
import { chapter, chapterHead, footnote } from '../components.ts';
import { esc, reportFormat, type Copy, labelFor, localize } from '../format.ts';
import { icon } from '../icons.ts';
import { CITY_NAMES, SEISMIC_LEVELS } from '../labels.ts';
import { addressDot, mapHtml, type MapMarker, type MapSpec } from '../maps.ts';
import type { ReportData, ReportLocale } from '../report-data.ts';
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
const CONCLUSIONS: Record<string, { title: Copy; body: Copy }> = {
  low: {
    title: ['Pe scurt: risc scăzut', 'In brief: low risk'],
    body: [
      'Codul seismic cere aici cea mai mică accelerație de proiectare din țară. Contează în continuare cât de bine e construit și întreținut blocul.',
      "The seismic code specifies the country's lowest design ground acceleration here. How well the building was constructed and maintained still matters.",
    ],
  },
  moderate: {
    title: ['Pe scurt: risc moderat, nu ridicat', 'In brief: moderate risk, not high'],
    body: [
      'Zona e la mijlocul scalei din codul seismic. Cutremurele mari ale țării vin din Vrancea și ajung aici slăbite. Ce contează mai departe e cât de bine e construit și întreținut blocul.',
      "The area is in the middle of the seismic code's scale. The country's major earthquakes originate in Vrancea and are weaker by the time they reach this area. How well the building was constructed and maintained still matters.",
    ],
  },
  high: {
    title: ['Pe scurt: risc ridicat', 'In brief: high risk'],
    body: [
      'Zona e în partea de sus a scalei din codul seismic. Cere anul construcției, expertiza tehnică și dacă blocul a fost consolidat.',
      "The area is near the top of the seismic code's scale. Ask for the year of construction, the structural assessment and whether the building has been strengthened.",
    ],
  },
  very_high: {
    title: ['Pe scurt: risc foarte ridicat', 'In brief: very high risk'],
    body: [
      'Zona are cea mai mare accelerație de proiectare din codul seismic. Cere anul construcției, expertiza tehnică, clasa de risc seismic și dacă blocul a fost consolidat.',
      'The area has the highest design ground acceleration in the seismic code. Ask for the year of construction, the structural assessment, the seismic risk class and whether the building has been strengthened.',
    ],
  },
};
function acceleration(locale: ReportLocale, value: number): string {
  const { formatNumber } = reportFormat(locale);
  return `${formatNumber(value, 2)} g`;
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

const CATALOGUES: Record<string, Copy> = {
  'catalogul USGS': ['catalogul USGS', 'the USGS catalogue'],
  'catalogul EMSC': ['catalogul EMSC', 'the EMSC catalogue'],
  'catalogul USGS și EMSC': ['catalogul USGS și EMSC', 'the USGS and EMSC catalogues'],
};

const CATALOGUE_NAMES: Record<string, Copy> = {
  'U.S. Geological Survey, catalogul ComCat': [
    'U.S. Geological Survey, catalogul ComCat',
    'U.S. Geological Survey, ComCat catalogue',
  ],
};

const CATALOGUE_LICENCES: Record<string, Copy> = {
  'domeniu public': ['domeniu public', 'public domain'],
};

function catalogueCredit(locale: ReportLocale, earthquakes: Earthquakes): string {
  const { t } = reportFormat(locale);
  if (earthquakes.sources.length === 0) return labelFor(locale, CATALOGUES, earthquakes.catalogue);
  return earthquakes.sources
    .map((source) => {
      const name = labelFor(locale, CATALOGUE_NAMES, source.name);
      const licence = labelFor(locale, CATALOGUE_LICENCES, source.license);
      return `${name} (${licence})`;
    })
    .join(t(' și ', ' and '));
}

function sourceLinks(locale: ReportLocale, earthquakes: Earthquakes): string {
  if (earthquakes.sources.length === 0)
    return esc(labelFor(locale, CATALOGUES, earthquakes.catalogue));
  return earthquakes.sources
    .map((source) => {
      const name = labelFor(locale, CATALOGUE_NAMES, source.name);
      const licence = labelFor(locale, CATALOGUE_LICENCES, source.license);
      const label = `${esc(name)}, ${esc(licence)}`;
      return source.url ? `<a href="${esc(source.url)}">${label}</a>` : label;
    })
    .join(' · ');
}

function strongest(earthquakes: Earthquakes): Earthquakes['events'] {
  return [...earthquakes.events]
    .sort((left, right) => right.magnitude - left.magnitude || left.distance_km - right.distance_km)
    .slice(0, LISTED_EARTHQUAKES);
}

function conclusionBox(
  locale: ReportLocale,
  level: string | null,
  building: Seismic['building'],
): string {
  const { t } = reportFormat(locale);
  const conclusion = level === null ? undefined : CONCLUSIONS[level];
  const year = building
    ? `<p>${t('Anul declarat al construcției: {0}. Întreabă după ce normativ a fost proiectat blocul și dacă are expertiză tehnică.', 'Declared year of construction: {0}. Ask which code the building was designed to and whether it has a structural assessment.', String(building.construction_year))}</p>`
    : '';
  if (!conclusion && !year) return '';
  return `<div class="se-concl">${conclusion ? `<b>${esc(localize(locale, conclusion.title))}</b><p>${esc(localize(locale, conclusion.body))}</p>` : ''}${year}</div>`;
}

function scaleCard(seismic: Seismic, report: ReportData): string {
  const { t, formatNumber } = reportFormat(report.locale);
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
        `<span class="se-c${group.isHere ? ' me' : ''}" style="left:${position(group.value)}%"><b>${acceleration(report.locale, group.value)}</b><em>${esc(group.cities)}</em></span>`,
    )
    .join('');
  const scale =
    groups.length < 2
      ? ''
      : `<p class="scv-h">${t('Cum stă {0} față de celelalte {1} orașe', 'How {0} compares with the other {1} cities', esc(report.city.name), String(seismic.comparison.length - 1))}</p><div class="se-trk"><div class="se-bar">${bands}</div>${stops}</div>`;
  const pill =
    seismic.level === null
      ? ''
      : `<span class="scv-pill" style="background:${LEVEL_FILLS[seismic.level] ?? '#EFE3D4'}">${esc(labelFor(report.locale, SEISMIC_LEVELS, seismic.level))}</span>`;
  return `<section class="card scv scv1 sesc"><div class="scv1-s"><span class="scv-k" style="color:${COLOR}">${t('Seismic', 'Seismic risk')}</span><span class="scv-big" style="color:${COLOR}">${formatNumber(seismic.ag_g, 2)}<small> g</small></span>${pill}</div><div class="scv1-r">${scale}</div><div class="scvm"><span class="y">${icon('check')}<span><b>${t('Ține cont de', 'Includes')}</b>${t(' accelerația de proiectare din codul seismic {0}', ' design ground acceleration from seismic code {0}', esc(seismic.code))}</span></span><span class="n">${icon('x')}<span><b>${t('Nu ține cont de', 'Excludes')}</b>${t(' starea clădirii și de consolidări', ' building condition and seismic strengthening')}</span></span></div></section>`;
}

function earthquakeBlock(
  earthquakes: Earthquakes,
  seismic: Seismic,
  report: ReportData,
): { html: string; map: MapSpec } {
  const { t, formatNumber, longDate } = reportFormat(report.locale);
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
  const key = `<div class="gz-key"><span><i class="se-k1"></i>${t('cutremur, cu cât mai mare cercul, cu atât mai puternic', 'earthquake; larger circles indicate greater magnitude')}</span><span><i class="se-k2"></i>${t('cele mai puternice {0}, cu numărul din listă', 'the {0} strongest, numbered as in the list', String(top.length))}</span></div>`;
  const list = top
    .map(
      (event, index) =>
        `<li><span class="se-n">${String(index + 1)}</span><span class="se-mb" style="--s:${String(Math.round(26 + (event.magnitude - 4) * 10))}px">${formatNumber(event.magnitude, 1)}</span><span class="zg-src-t"><b>${esc(longDate(event.date))}</b>${event.place ? `<small>${t('lângă {0}', 'near {0}', esc(event.place))}</small>` : ''}</span><span class="zg-src-m"><b>${formatNumber(event.distance_km)}</b> km</span></li>`,
    )
    .join('');
  return {
    map,
    html: `<section class="gzA seA"><div class="gzA-m">${mapHtml(report.locale, map)}${key}</div><aside class="gzA-p"><div class="eyebrow" style="color:${COLOR}">${t('Din {0} încoace', 'Since {0}', String(earthquakes.since_year))}</div><h3>${t('Cele mai puternice cutremure la mai puțin de {0} km', 'Strongest earthquakes within {0} km', formatNumber(earthquakes.radius_km))}</h3><ul class="zg-src se-ql-list">${list}</ul>${conclusionBox(report.locale, seismic.level, seismic.building)}</aside></section>${footnote(t('Cutremure: {0}, din {1} încoace, magnitudine de cel puțin {2}{3}. Hartă: OpenStreetMap.', 'Earthquakes: {0}, since {1}, magnitude {2} or higher{3}. Map: OpenStreetMap.', catalogueCredit(report.locale, earthquakes), String(earthquakes.since_year), formatNumber(earthquakes.min_magnitude, 1), earthquakes.retrieved_on ? t(', citite pe {0}', ', retrieved on {0}', longDate(earthquakes.retrieved_on)) : ''))}`,
  };
}

export const seismicChapter: ChapterBuilder = (report) => {
  const { t, formatNumber, plural } = reportFormat(report.locale);
  const seismic = report.sections.seismic;
  const eyebrow = t(
    'Risc seismic · context, nu intră în scor',
    'Seismic risk · context, not part of the score',
  );
  if (!seismic) {
    return {
      html: chapter(
        chapterHead(report.locale, {
          eyebrow,
          color: COLOR,
          title: t('Riscul seismic al zonei', 'Seismic risk in the area'),
        }) +
          footnote(
            t(
              'Nu avem valoarea din codul seismic pentru această adresă.',
              'The seismic code value is not available for this address.',
            ),
          ),
      ),
      maps: [],
    };
  }
  const precision =
    seismic.precision === 'address'
      ? t('zona adresei', 'around the address')
      : t('oraș', 'citywide');
  const earthquakes = seismic.earthquakes?.events.length ? seismic.earthquakes : null;
  const biggest = earthquakes ? strongest(earthquakes)[0] : undefined;
  const levelLabel =
    seismic.level === null ? null : labelFor(report.locale, SEISMIC_LEVELS, seismic.level);
  const head =
    earthquakes && biggest
      ? chapterHead(report.locale, {
          eyebrow,
          color: COLOR,
          precision,
          title: t(
            'Cel mai puternic cutremur din jur: {0}, în {1}',
            'Strongest nearby earthquake: {0}, in {1}',
            formatNumber(biggest.magnitude, 1),
            biggest.date.slice(0, 4),
          ),
          lead: t(
            'Din {0} încoace, {1} de cel puțin {2} la mai puțin de {3} km de {4}.',
            'Since {0}: {1} of magnitude {2} or higher within {3} km of {4}.',
            String(earthquakes.since_year),
            plural(earthquakes.events.length, ['cutremur', 'earthquake'], 'cutremure', [
              'de cutremure',
              'earthquakes',
            ]),
            formatNumber(earthquakes.min_magnitude, 1),
            formatNumber(earthquakes.radius_km),
            report.city.name,
          ),
        })
      : chapterHead(report.locale, {
          eyebrow,
          color: COLOR,
          precision,
          title: t(
            'Accelerația de proiectare e {0}{1}',
            'Design ground acceleration is {0}{1}',
            acceleration(report.locale, seismic.ag_g),
            levelLabel ? t(': nivel {0}', ': {0} level', levelLabel.toLowerCase()) : '',
          ),
          lead: t(
            'Valoarea vine din codul seismic {0} și arată pentru ce cutremur se proiectează clădirile din {1}.',
            'The value comes from seismic code {0} and describes the earthquake forces buildings in {1} are designed to withstand.',
            seismic.code,
            report.city.name,
          ),
        });
  const block = earthquakes ? earthquakeBlock(earthquakes, seismic, report) : null;
  return {
    html: chapter(
      `${head}${block ? block.html : conclusionBox(report.locale, seismic.level, seismic.building)}<div class="sfB-rest se-rest">${scaleCard(seismic, report)}<div class="how"><div class="how-t">${t('{0}Surse și date', '{0}Sources and data', icon('info'))}</div><div class="in"><p><b>${t('Surse:', 'Sources:')}</b>${t(' Cod seismic {0}{1}', ' Seismic code {0}{1}', esc(seismic.code), earthquakes ? ` · ${sourceLinks(report.locale, earthquakes)}` : '')}</p><p><b>${t('Pondere în scorul de zonă:', 'Weight in the area score:')}</b>${t(' nu intră în scor. E context.', ' none. This is context only.')}</p></div></div></div>`,
    ),
    maps: block ? [block.map] : [],
  };
};
