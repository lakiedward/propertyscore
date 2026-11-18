import type { ChapterBuilder } from '../chapter.ts';
import { esc, formatMonth, formatSourceDate } from '../format.ts';
import { icon, logo, type IconName } from '../icons.ts';
import { SOURCE_LABELS } from '../labels.ts';

const SOURCE_GROUPS: readonly { title: string; icon: IconName; keys: readonly string[] }[] = [
  { title: 'Hartă și străzi', icon: 'map', keys: ['osm', 'walk_routing', 'noise'] },
  { title: 'Transport', icon: 'bus', keys: ['gtfs'] },
  {
    title: 'Aer și industrie',
    icon: 'wind',
    keys: ['cams', 'eea_stations', 'eea_air_map', 'eea_industrial'],
  },
  { title: 'Servicii', icon: 'heart', keys: ['siiir', 'cnas', 'ms_upu'] },
  { title: 'Seismic', icon: 'act', keys: ['seismic'] },
];

export const closingChapter: ChapterBuilder = (report) => {
  const dates = report.snapshot.sourceDates;
  const grouped = new Set(SOURCE_GROUPS.flatMap((group) => group.keys));
  const others = Object.keys(dates).filter(
    (key) => !grouped.has(key) && SOURCE_LABELS[key] !== undefined && !key.endsWith('_year'),
  );
  const groups = [...SOURCE_GROUPS, { title: 'Altele', icon: 'info' as const, keys: others }]
    .map((group) => {
      const rows = group.keys.flatMap((key) => {
        const value = dates[key];
        return value === undefined
          ? []
          : [
              `<div class="sr"><span>${esc(SOURCE_LABELS[key] ?? key)}</span><span class="dt">${esc(formatSourceDate(value))}</span></div>`,
            ];
      });
      return rows.length === 0
        ? ''
        : `<div class="bB-s"><div class="sgh">${icon(group.icon)}${esc(group.title)}</div>${rows.join('')}</div>`;
    })
    .join('');
  const next = `<section class="bB-next"><div class="eyebrow">Pasul următor</div><h2>Raportul descrie zona. Verifică și apartamentul.</h2><div class="bB-pc one"><div class="pcard fiz"><div class="top"><span class="lock fiz"><span class="tile">${logo('fizic')}</span>Property <span class="tag">Fizic</span></span></div><div class="inc"><span class="lock sc"><span class="tile">${logo('smart')}</span>Smart <span class="tag">Check</span></span> raportul online e inclus</div><p><b>Starea apartamentului o verifică un inspector,</b> la fața locului: întrebări, fotografii, plan și tur 360°.</p></div></div></section>`;
  const method = `<section class="bB-meth"><div class="eyebrow">Surse și date</div><h3>Aceeași adresă primește același scor, oricând o verifici.</h3><p class="l">Unde nu avem date bune, îți spunem.</p><div class="bB-st">${groups}</div><p class="snap">${icon('info')}Date din ${esc(formatMonth(report.snapshot.period))} · ${esc(report.city.name)}.</p></section>`;
  return {
    html: `<article class="chapter closing"><div class="wrap"><div class="below bx"><div class="bB">${next}${method}</div></div></div></article>`,
    maps: [],
  };
};
