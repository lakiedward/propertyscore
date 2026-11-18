import type { ChapterBuilder } from '../chapter.ts';
import { categoryEyebrow, chapter, chapterHead, note, rows, scoreCard } from '../components.ts';
import { formatDistance } from '../format.ts';
import { NOISE_KINDS, NOISE_REFERENCES } from '../labels.ts';
import { around, mapHtml, type MapSpec } from '../maps.ts';

const BAND_DB = 5;
const MAP_RADIUS_M = 500;
const LISTED_SOURCES = 5;
const SOURCE_COLORS: Record<string, string> = {
  road: '#A63A24',
  tram: '#7A5200',
  rail: '#38513F',
};

function decibelBand(value: number): string {
  const low = Math.floor(value / BAND_DB) * BAND_DB;
  return `${String(low)}–${String(low + BAND_DB)} dB`;
}

function reference(value: number): string {
  const closest = [...NOISE_REFERENCES].sort(
    (left, right) => Math.abs(left.db - value) - Math.abs(right.db - value),
  )[0];
  return closest ? `cât o ${closest.label}` : '';
}

export const noiseChapter: ChapterBuilder = (report) => {
  const summary = report.categories.noise;
  const section = report.sections.noise;
  if (section?.lden == null) {
    const head = chapterHead({
      eyebrow: categoryEyebrow('noise', summary),
      title: 'Zgomotul din jurul adresei',
    });
    return {
      html: chapter(head + scoreCard('noise', report, { better: 'Mai liniștit' })),
      maps: [],
    };
  }
  const sources = [...section.sources]
    .sort((left, right) => left.distance_m - right.distance_m)
    .slice(0, LISTED_SOURCES);
  const loudest = sources[0];
  const head = chapterHead({
    eyebrow: categoryEyebrow('noise', summary),
    precision:
      section.precision === 'street' ? 'hărți strategice de zgomot' : 'estimare din străzi',
    title: `Cam ${decibelBand(section.lden)} la adresă, ${reference(section.lden)}`,
    lead: loudest
      ? `Cea mai apropiată sursă de zgomot e ${loudest.name ?? NOISE_KINDS[loudest.kind] ?? loudest.kind}, la ${formatDistance(loudest.distance_m)}.`
      : 'Nu am găsit surse mari de zgomot în apropiere.',
  });
  const center: [number, number] = [report.longitude, report.latitude];
  const map: MapSpec = {
    id: 'map-noise',
    center,
    fit: around(center, MAP_RADIUS_M),
    layers: section.map.lines
      ? [{ kind: 'line', data: section.map.lines, color: '#A63A24', width: 3, opacity: 0.55 }]
      : [],
    markers: [{ position: center }],
  };
  const night =
    section.lnight === null
      ? ''
      : `<div class="soft"><strong>${decibelBand(section.lnight)}</strong><span>noaptea</span></div>`;
  const levels = `<div class="dark slate"><strong>${decibelBand(section.lden)}</strong><span>ziua, ${reference(section.lden)}</span></div>${night}`;
  const list =
    sources.length === 0
      ? note('Nu am găsit surse mari de zgomot în apropiere.')
      : rows(
          sources.map((source) => ({
            title: source.name ?? NOISE_KINDS[source.kind] ?? source.kind,
            detail: NOISE_KINDS[source.kind] ?? source.kind,
            value: formatDistance(source.distance_m),
            dot: SOURCE_COLORS[source.kind] ?? '#52685B',
          })),
        );
  const scale = NOISE_REFERENCES.map(
    (item) =>
      `<div class="soft" style="margin:0"><strong>${String(item.db)} dB</strong><span>${item.label}</span></div>`,
  ).join('');
  return {
    html: chapter(
      head +
        `<div class="grid cols-map">${mapHtml(map, 96)}<section class="card"><p class="eyebrow">La adresă</p><div style="margin-top:2mm">${levels}</div><h3 style="margin-top:4mm">Ce se aude cel mai tare</h3>${list}</section></div>` +
        `<div class="grid" style="grid-template-columns:repeat(4,1fr);gap:2.5mm;margin-top:4mm">${scale}</div>` +
        note(
          section.precision === 'street'
            ? 'Valoarea vine din hărțile strategice de zgomot ale orașului.'
            : 'Estimare din străzile, liniile de tramvai, calea ferată și clădirile din OpenStreetMap.',
        ) +
        scoreCard('noise', report, { better: 'Mai liniștit' }),
    ),
    maps: [map],
  };
};
