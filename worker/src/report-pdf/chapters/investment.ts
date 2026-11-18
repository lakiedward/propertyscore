import type { ChapterBuilder } from '../chapter.ts';
import { chapter, chapterHead, footnote } from '../components.ts';
import { esc, formatDate, formatEuro, formatMonth, formatNumber, shortMonth } from '../format.ts';
import { icon } from '../icons.ts';
import { MARKET_SOURCES } from '../labels.ts';
import type { ReportData } from '../report-data.ts';
import { CONTEXT_THEME } from '../theme.ts';

type Investment = NonNullable<ReportData['sections']['investment']>;
type Sale = NonNullable<Investment['sale']>;
type Interval = {
  name: string;
  count: number | null;
  median: number;
  low: number | null;
  high: number | null;
  isCity: boolean;
};

const COLOR = CONTEXT_THEME.investment.color;
const CITY_WIDE = new Set(['city_statistics', 'city_average', 'city']);
const SCALE_MARGIN = 0.25;
const YIELD_SCALE_PCT = 8;
const HISTORY_FLOOR = 0.4;
const EXAMPLE = '<span class="inv-ex">exemplu</span>';

function eyebrow(text: string): string {
  return `<div class="eyebrow" style="color:${COLOR}">${esc(text)}</div>`;
}

function intervalRow(item: Interval, scale: { min: number; max: number }): string {
  const position = (value: number) => ((value - scale.min) / (scale.max - scale.min)) * 100;
  const count = item.count === null ? '' : `<small>${formatNumber(item.count)} de oferte</small>`;
  const range =
    item.low === null || item.high === null
      ? ''
      : `<i class="b" style="left:${position(item.low).toFixed(2)}%;width:${(position(item.high) - position(item.low)).toFixed(2)}%"></i>`;
  const ends =
    item.low === null || item.high === null
      ? ''
      : `<em style="left:${position(item.low).toFixed(2)}%">${formatNumber(item.low)}</em><em class="r" style="left:${position(item.high).toFixed(2)}%">${formatNumber(item.high)}</em>`;
  return `<div class="inv-row ${item.isCity ? 'z' : 'c'}"><div class="inv-row-h"><span>${esc(item.name)}${count}</span><b>${formatNumber(Math.round(item.median))} €/m²</b></div><div class="inv-trk">${range}<i class="m" style="left:${position(item.median).toFixed(2)}%"></i>${ends}</div></div>`;
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
      isCity: true,
    },
    ...section.nearby.map((locality) => ({
      name: `${locality.name}, lângă oraș`,
      count: locality.count,
      median: locality.median_eur_m2,
      low: locality.p25_eur_m2,
      high: locality.p75_eur_m2,
      isCity: false,
    })),
  ];
  const values = items.flatMap((item) => [
    item.median,
    item.low ?? item.median,
    item.high ?? item.median,
  ]);
  const span = Math.max(...values) - Math.min(...values) || 1;
  const scale = {
    min: Math.min(...values) - span * SCALE_MARGIN,
    max: Math.max(...values) + span * SCALE_MARGIN,
  };
  const typical = sale.typical
    ? `<div class="inv-diff"><span>Apartamentul tipic din anunțuri: ${formatNumber(sale.typical.area_m2)} m², ${formatEuro(sale.typical.price_eur)}</span></div>`
    : '';
  const title =
    sale.p25_eur_m2 != null && sale.p75_eur_m2 != null
      ? `Jumătate din apartamente se cer între ${formatNumber(sale.p25_eur_m2)} și ${formatNumber(sale.p75_eur_m2)} €/m²`
      : `Prețul cerut din mijloc: ${formatNumber(Math.round(sale.median_eur_m2))} €/m²`;
  return `<section class="card ac invP"><div class="ac-h"><div>${eyebrow('Preț cerut pe metru pătrat')}<h3>${esc(title)}</h3></div></div><div class="inv-rows">${items.map((item) => intervalRow(item, scale)).join('')}</div>${typical}<div class="ai-leg inv-leg"><span><i class="b"></i>intervalul tipic</span><span><i class="m"></i>prețul din mijloc</span></div></section>`;
}

function homeCard(section: Investment, sale: Sale): string {
  const area = section.declared.area_m2;
  if (sale.estimate_eur == null || area === null) {
    return `<section class="card ac invE">${eyebrow('Pentru apartamentul tău')}<p class="hint">Fără suprafața apartamentului putem arăta doar prețul cerut pe metru pătrat.</p></section>`;
  }
  const bounds =
    sale.estimate_low_eur != null && sale.estimate_high_eur != null
      ? `<small>între ${formatNumber(sale.estimate_low_eur)} și ${formatEuro(sale.estimate_high_eur)}</small>`
      : '';
  const rentValue = section.rent?.estimate_eur ?? section.rent?.median_eur ?? null;
  const rent =
    rentValue === null
      ? ''
      : `<div class="inv-big g"><span>Chirie cerută estimată${section.rent?.is_example ? ` ${EXAMPLE}` : ''}</span><b>circa ${formatEuro(rentValue)} <i>pe lună</i></b></div>`;
  return `<section class="card ac invE">${eyebrow('Pentru apartamentul tău')}<div class="inv-sl"><div class="inv-sl-h"><span>Suprafața declarată</span><b>${formatNumber(area)} m²</b></div></div><div class="inv-big"><span>Preț cerut estimat</span><b>circa ${formatEuro(sale.estimate_eur)}</b>${bounds}</div>${rent}</section>`;
}

function yieldCard(report: ReportData, section: Investment): string {
  const value = section.yield.gross_pct;
  if (value === null) return '';
  const width = Math.min(100, (value / YIELD_SCALE_PCT) * 100).toFixed(1);
  return `<section class="card ac invY"><div class="ac-h"><div>${eyebrow('Randament brut pe an')}<h3>Chiria pe un an înseamnă ${formatNumber(value, 1)}% din preț</h3></div></div><div class="inv-yb z"><span>${esc(report.city.name)}${section.yield.is_example ? ` ${EXAMPLE}` : ''}</span><div><i style="width:${width}%"></i></div><b>${formatNumber(value, 1)}%</b></div><p class="fqx-foot">${icon('info')}<span>Chiria pe 12 luni împărțită la preț, înainte de taxe, reparații și luni fără chiriaș.</span></p></section>`;
}

function historyCard(section: Investment): string {
  const months = section.history?.months ?? [];
  const first = months[0];
  const last = months.at(-1);
  if (!first || !last || months.length < 2) return '';
  const change = last.median_eur_m2 - first.median_eur_m2;
  const values = months.map((month) => month.median_eur_m2);
  const low = Math.min(...values);
  const span = Math.max(...values) - low || 1;
  const bars = months
    .map((month, index) => {
      const height =
        (HISTORY_FLOOR + ((month.median_eur_m2 - low) / span) * (1 - HISTORY_FLOOR)) * 90;
      return `<div class="${index === months.length - 1 ? 'on' : ''}"><b>${formatNumber(month.median_eur_m2)}</b><i style="height:${height.toFixed(1)}%"></i><span>${esc(shortMonth(month.period))}</span></div>`;
    })
    .join('');
  const direction = change > 0 ? 'a urcat cu' : change < 0 ? 'a scăzut cu' : 'a rămas la fel, cu';
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  const area = section.declared.area_m2;
  const percent = `${sign}${formatNumber(Math.abs((change / first.median_eur_m2) * 100), 1)}% în ${String(months.length - 1)} luni`;
  const delta =
    area === null
      ? `<div class="inv-big g"><span>Față de ${esc(shortMonth(first.period))}</span><b>${sign} ${formatNumber(Math.abs(change))} €/m²</b><small>${percent}</small></div>`
      : `<div class="inv-big g"><span>Pentru ${formatNumber(area)} m², față de ${esc(shortMonth(first.period))}</span><b>${sign} ${formatEuro(Math.round(Math.abs(change * area) / 100) * 100)}</b><small>${percent}</small></div>`;
  return `<section class="card ac invX"><div class="ac-h"><div>${eyebrow(`Ultimele ${String(months.length)} luni`)}<h3>Din ${esc(shortMonth(first.period))}, prețul cerut ${direction} ${formatNumber(Math.abs(change))} €/m²</h3></div></div><div class="inv-x1"><div class="inv-hist">${bars}</div>${delta}</div></section>`;
}

function sourcesCard(section: Investment): string {
  const hasExample = section.rent?.is_example === true || section.yield.is_example === true;
  const items = section.sources
    .map((source) => {
      const when = source.observed_on ? formatDate(source.observed_on) : formatMonth(source.period);
      const link = source.url
        ? `<a class="inv-lnk" href="${esc(source.url)}">${esc(new URL(source.url).hostname.replace(/^www\./, ''))}${icon('arr')}</a>`
        : '';
      return `<li><span class="zg-dot" style="background:${COLOR}"></span><span class="zg-src-t"><b>${esc(MARKET_SOURCES[source.source] ?? source.source)}, ${esc(when)}</b>${source.label ? `<small>${esc(source.label)}</small>` : ''}</span>${link}</li>`;
    })
    .join('');
  const reference = section.reference_date ? ` · ${formatDate(section.reference_date)}` : '';
  return `<section class="card ac invSrc">${eyebrow(`Sursa cifrelor${reference}`)}<ul class="zg-src">${items}</ul><p class="fqx-foot">${icon('info')}<span>Sunt prețuri cerute în anunțuri, nu prețuri de vânzare.${hasExample ? ' Cifrele marcate „exemplu” se înlocuiesc la primul import.' : ''}</span></p></section>`;
}

export const investmentChapter: ChapterBuilder = (report) => {
  const section = report.sections.investment;
  const label = 'Investiție · context, nu intră în scor';
  const sale = section?.sale ?? null;
  if (!section || !sale) {
    return {
      html: chapter(
        chapterHead({
          eyebrow: label,
          color: COLOR,
          title: 'Încă nu avem date de piață pentru această adresă',
        }) +
          footnote(
            'Capitolul arată prețul cerut pe metru pătrat, chiria și randamentul când avem date de piață pentru oraș.',
          ),
      ),
      maps: [],
    };
  }
  const isCityWide = CITY_WIDE.has(sale.precision);
  const area = section.declared.area_m2;
  const head = chapterHead({
    eyebrow: label,
    color: COLOR,
    precision: isCityWide ? 'oraș' : 'în jurul adresei',
    title: `${isCityWide ? `În ${report.city.name}` : 'În jurul adresei'} se cer în jur de ${formatNumber(sale.median_eur_m2)} € pe metru pătrat`,
    lead:
      area !== null && sale.estimate_eur != null
        ? `Pentru ${formatNumber(area)} m², cam ${formatEuro(sale.estimate_eur)}, preț cerut.`
        : 'Preț cerut în anunțuri, nu preț de vânzare.',
  });
  return {
    html: chapter(
      `${head}<div class="invA">${priceCard(report, section, sale)}<div class="inv-col">${homeCard(section, sale)}${yieldCard(report, section)}</div></div>${historyCard(section)}${sourcesCard(section)}`,
    ),
    maps: [],
  };
};
