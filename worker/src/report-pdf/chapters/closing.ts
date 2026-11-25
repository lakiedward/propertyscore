import type { ChapterBuilder } from '../chapter.ts';
import { esc, reportFormat, type Copy, labelFor, localize } from '../format.ts';
import { icon, logo, type IconName } from '../icons.ts';
import { SOURCE_LABELS } from '../labels.ts';

const SOURCE_GROUPS: readonly { title: Copy; icon: IconName; keys: readonly string[] }[] = [
  {
    title: ['Hartă și străzi', 'Maps and streets'],
    icon: 'map',
    keys: ['osm', 'walk_routing', 'noise'],
  },
  { title: ['Transport', 'Transport'], icon: 'bus', keys: ['gtfs'] },
  {
    title: ['Aer și industrie', 'Air and industry'],
    icon: 'wind',
    keys: ['cams', 'eea_stations', 'eea_air_map', 'eea_industrial'],
  },
  { title: ['Servicii', 'Services'], icon: 'heart', keys: ['siiir', 'cnas', 'ms_upu'] },
  { title: ['Seismic', 'Seismic risk'], icon: 'act', keys: ['seismic'] },
];

export const closingChapter: ChapterBuilder = (report) => {
  const { t, formatSourceDate, formatMonth } = reportFormat(report.locale);
  const dates = report.snapshot.sourceDates;
  const grouped = new Set(SOURCE_GROUPS.flatMap((group) => group.keys));
  const others = Object.keys(dates).filter(
    (key) => !grouped.has(key) && SOURCE_LABELS[key] !== undefined && !key.endsWith('_year'),
  );
  const groups = [
    ...SOURCE_GROUPS,
    { title: ['Altele', 'Other'] as const, icon: 'info' as const, keys: others },
  ]
    .map((group) => {
      const rows = group.keys.flatMap((key) => {
        const value = dates[key];
        return value === undefined
          ? []
          : [
              `<div class="sr"><span>${esc(labelFor(report.locale, SOURCE_LABELS, key))}</span><span class="dt">${esc(formatSourceDate(value))}</span></div>`,
            ];
      });
      return rows.length === 0
        ? ''
        : `<div class="bB-s"><div class="sgh">${icon(group.icon)}${esc(localize(report.locale, group.title))}</div>${rows.join('')}</div>`;
    })
    .join('');
  const next = `<section class="bB-next"><div class="eyebrow">${t('Pasul următor', 'Next step')}</div><h2>${t('Raportul descrie zona. Verifică și apartamentul.', 'This report describes the area. Check the property too.')}</h2><div class="bB-pc one"><div class="pcard fiz"><div class="top"><span class="lock fiz"><span class="tile">${logo('fizic')}</span>Property <span class="tag">Fizic</span></span></div><div class="inc"><span class="lock sc"><span class="tile">${logo('smart')}</span>Smart <span class="tag">Check</span></span>${t(' raportul online e inclus', ' online report included')}</div><p><b>${t('Starea apartamentului o verifică un inspector,', 'An inspector checks the condition of the property on site,')}</b>${t(' la fața locului: întrebări, fotografii, plan și tur 360°.', ' with questions, photographs, a floor plan and a 360° tour.')}</p></div></div></section>`;
  const method = `<section class="bB-meth"><div class="eyebrow">${t('Surse și date', 'Sources and data')}</div><h3>${t('Aceeași adresă primește același scor, oricând o verifici.', 'The same address gets the same score whenever you check it.')}</h3><p class="l">${t('Unde nu avem date bune, îți spunem.', 'We tell you where reliable data is missing.')}</p><div class="bB-st">${groups}</div><p class="snap">${t('{0}Date din {1} · {2}.', '{0}Data from {1} · {2}.', icon('info'), esc(formatMonth(report.snapshot.period)), esc(report.city.name))}</p></section>`;
  return {
    html: `<article class="chapter closing"><div class="wrap"><div class="below bx"><div class="bB">${next}${method}</div></div></div></article>`,
    maps: [],
  };
};
