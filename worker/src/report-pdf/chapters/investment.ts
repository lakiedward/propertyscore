import type { ChapterBuilder } from '../chapter.ts';
import { card, chapter, chapterHead, missingSection, note } from '../components.ts';
import { esc, formatDate, formatEuro, formatMonth, formatNumber, shortMonth } from '../format.ts';
import { MARKET_SOURCES } from '../labels.ts';
import type { ReportData } from '../report-data.ts';

type Investment = NonNullable<ReportData['sections']['investment']>;
type Sale = NonNullable<Investment['sale']>;
type Interval = {
  name: string;
  count: number | null;
  median: number;
  low: number | null;
  high: number | null;
  color: string;
};

const CITY_WIDE = new Set(['city_statistics', 'city_average', 'city']);
const HISTORY_HEIGHT_MM = 30;

function perSquareMetre(value: number): string {
  return `${formatNumber(Math.round(value))} €/m²`;
}

function interval(item: Interval, scale: { min: number; max: number }): string {
  const position = (value: number) =>
    (((value - scale.min) / (scale.max - scale.min)) * 100).toFixed(1);
  const range =
    item.low === null || item.high === null
      ? ''
      : `<span class="interval-range" style="left:${position(item.low)}%;right:${(100 - Number(position(item.high))).toFixed(1)}%;--range:${item.color}"></span>`;
  const ends =
    item.low === null || item.high === null
      ? ''
      : `<div class="interval-ends"><span>${formatNumber(item.low)}</span><span>${formatNumber(item.high)}</span></div>`;
  const count = item.count === null ? '' : `<small>${formatNumber(item.count)} de oferte</small>`;
  return `<div class="interval"><div class="interval-head"><span><b>${esc(item.name)}</b>${count}</span><strong>${perSquareMetre(item.median)}</strong></div><div class="interval-track">${range}<span class="interval-median" style="left:${position(item.median)}%"></span></div>${ends}</div>`;
}

function priceCard(report: ReportData, section: Investment, sale: Sale): string {
  const isCityWide = CITY_WIDE.has(sale.precision);
  const items: Interval[] = [
    {
      name: isCityWide ? `${report.city.name}, tot orașul` : 'În jurul adresei',
      count: sale.count ?? null,
      median: sale.median_eur_m2,
      low: sale.p25_eur_m2 ?? null,
      high: sale.p75_eur_m2 ?? null,
      color: '#103F32',
    },
    ...section.nearby.map((locality) => ({
      name: `${locality.name}, lângă oraș`,
      count: locality.count,
      median: locality.median_eur_m2,
      low: locality.p25_eur_m2,
      high: locality.p75_eur_m2,
      color: '#9FB9A6',
    })),
  ];
  const values = items.flatMap((item) => [
    item.median,
    item.low ?? item.median,
    item.high ?? item.median,
  ]);
  const span = Math.max(...values) - Math.min(...values) || 1;
  const scale = { min: Math.min(...values) - span * 0.15, max: Math.max(...values) + span * 0.15 };
  const typical = sale.typical
    ? `<p class="note"><b>Apartamentul tipic din anunțuri:</b> ${formatNumber(sale.typical.area_m2)} m², ${formatEuro(sale.typical.price_eur)}.</p>`
    : '';
  const title =
    sale.p25_eur_m2 != null && sale.p75_eur_m2 != null
      ? `Jumătate din apartamente se cer între ${formatNumber(sale.p25_eur_m2)} și ${formatNumber(sale.p75_eur_m2)} €/m²`
      : `Prețul cerut din mijloc: ${perSquareMetre(sale.median_eur_m2)}`;
  return card(
    title,
    items.map((item) => interval(item, scale)).join('') +
      typical +
      '<div class="legend"><span><i style="--swatch:#103F32"></i>intervalul tipic</span><span><i style="--swatch:#DDED69"></i>prețul din mijloc</span></div>',
    'Preț cerut pe metru pătrat',
  );
}

function homeCard(section: Investment, sale: Sale): string {
  const area = section.declared.area_m2;
  if (sale.estimate_eur == null) {
    return card(
      'Declară suprafața ca să vezi estimarea',
      note('Fără suprafața apartamentului putem arăta doar prețul cerut pe metru pătrat.'),
      'Pentru apartamentul tău',
    );
  }
  const bounds =
    sale.estimate_low_eur != null && sale.estimate_high_eur != null
      ? `<span>între ${formatEuro(sale.estimate_low_eur)} și ${formatEuro(sale.estimate_high_eur)}</span>`
      : '';
  const rentValue = section.rent?.estimate_eur ?? section.rent?.median_eur ?? null;
  const rent =
    rentValue === null
      ? ''
      : `<div class="soft"><span>Chirie cerută estimată</span><strong>≈ ${formatEuro(rentValue)}</strong> pe lună</div>`;
  const grossYield =
    section.yield.gross_pct === null
      ? ''
      : `<div class="soft"><span>Randament brut pe an</span><strong>${formatNumber(section.yield.gross_pct, 1)}%</strong><span>Chiria pe 12 luni împărțită la preț, înainte de taxe, reparații și luni fără chiriaș.</span></div>`;
  return card(
    area === null ? 'Estimare' : `Suprafața declarată: ${formatNumber(area)} m²`,
    `<div class="dark"><span>Preț cerut estimat</span><strong>≈ ${formatEuro(sale.estimate_eur)}</strong>${bounds}</div>${rent}${grossYield}`,
    'Pentru apartamentul tău',
  );
}

function historyCard(section: Investment): string {
  const months = section.history?.months ?? [];
  const first = months[0];
  const last = months.at(-1);
  if (!first || !last || months.length < 2) return '';
  const change = last.median_eur_m2 - first.median_eur_m2;
  const peak = Math.max(...months.map((month) => month.median_eur_m2));
  const floor = Math.min(...months.map((month) => month.median_eur_m2)) * 0.9;
  const columns = months.map((month, index) => {
    const height = (
      ((month.median_eur_m2 - floor) / (peak - floor)) *
      (HISTORY_HEIGHT_MM - 5)
    ).toFixed(1);
    const fill = index === months.length - 1 ? '#103F32' : '#A9B7AC';
    return `<div class="col">${formatNumber(month.median_eur_m2)}<i style="height:${height}mm;--swatch:${fill}"></i></div>`;
  });
  const labels = months.map((month) => `<span>${esc(shortMonth(month.period))}</span>`);
  const direction = change > 0 ? 'a urcat cu' : change < 0 ? 'a scăzut cu' : 'a rămas la fel, cu';
  return card(
    `Din ${shortMonth(first.period)}, prețul cerut ${direction} ${formatNumber(Math.abs(change))} €/m²`,
    `<div class="columns-chart" style="height:${String(HISTORY_HEIGHT_MM)}mm">${columns.join('')}</div><div class="columns-labels">${labels.join('')}</div>`,
    `Ultimele ${String(months.length)} luni`,
  );
}

function sourcesCard(section: Investment): string {
  const items = section.sources.map((source) => {
    const when = source.observed_on ? formatDate(source.observed_on) : formatMonth(source.period);
    const link = source.url
      ? `<span><a href="${esc(source.url)}">${esc(source.url)}</a></span>`
      : '';
    return `<div class="row source-links"><span class="dot"></span><div class="row-text"><b>${esc(MARKET_SOURCES[source.source] ?? source.source)}, ${esc(when)}</b>${link}</div></div>`;
  });
  const reference = section.reference_date ? ` · ${formatDate(section.reference_date)}` : '';
  return card(
    'De unde vin cifrele',
    `<div class="rows">${items.join('')}</div>${note('Sunt prețuri cerute în anunțuri, nu prețuri de vânzare.')}`,
    `Sursa cifrelor${reference}`,
  );
}

export const investmentChapter: ChapterBuilder = (report) => {
  const section = report.sections.investment;
  const eyebrow = 'Investiție · context, nu intră în scor';
  const sale = section?.sale ?? null;
  if (!section || !sale) {
    return {
      html: chapter(
        chapterHead({ eyebrow, title: 'Încă nu avem date de piață pentru această adresă' }) +
          missingSection(
            'Capitolul arată prețul cerut pe metru pătrat, chiria și randamentul când avem date de piață pentru oraș.',
          ),
      ),
      maps: [],
    };
  }
  const isCityWide = CITY_WIDE.has(sale.precision);
  const area = section.declared.area_m2;
  const head = chapterHead({
    eyebrow,
    precision: isCityWide ? 'oraș' : 'în jurul adresei',
    title: `${isCityWide ? `În ${report.city.name}` : 'În jurul adresei'} se cer în jur de ${formatNumber(sale.median_eur_m2)} € pe metru pătrat`,
    lead:
      area !== null && sale.estimate_eur != null
        ? `Pentru ${formatNumber(area)} m², cam ${formatEuro(sale.estimate_eur)}, preț cerut.`
        : 'Preț cerut în anunțuri, nu preț de vânzare.',
  });
  return {
    html: chapter(
      head +
        `<div class="grid" style="grid-template-columns:1.35fr 1fr">${priceCard(report, section, sale)}${homeCard(section, sale)}</div>` +
        historyCard(section) +
        sourcesCard(section),
    ),
    maps: [],
  };
};
