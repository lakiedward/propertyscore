import type { ChapterBuilder } from '../chapter.ts';
import { chapter, chapterHead, footnote } from '../components.ts';
import { esc, reportFormat, labelFor } from '../format.ts';
import { icon } from '../icons.ts';
import { MARKET_SOURCES, MARKET_SOURCE_DETAILS } from '../labels.ts';
import type { ReportData, ReportLocale } from '../report-data.ts';
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
function exampleTag(locale: ReportLocale): string {
  const { t } = reportFormat(locale);
  return `<span class="inv-ex">${t('exemplu', 'example')}</span>`;
}

function eyebrow(text: string): string {
  return `<div class="eyebrow" style="color:${COLOR}">${esc(text)}</div>`;
}

function intervalRow(
  locale: ReportLocale,
  item: Interval,
  scale: { min: number; max: number },
): string {
  const { t, formatNumber } = reportFormat(locale);
  const position = (value: number) => ((value - scale.min) / (scale.max - scale.min)) * 100;
  const count =
    item.count === null
      ? ''
      : `<small>${t('{0} de oferte', '{0} listings', formatNumber(item.count))}</small>`;
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
  const { t, formatNumber, formatEuro } = reportFormat(report.locale);
  const isCityWide = CITY_WIDE.has(sale.precision);
  const items: Interval[] = [
    {
      name: isCityWide
        ? t('{0}, tot orașul', '{0}, citywide', report.city.name)
        : t('În jurul adresei', 'Around the address'),
      count: sale.count ?? null,
      median: sale.median_eur_m2,
      low: sale.p25_eur_m2 ?? null,
      high: sale.p75_eur_m2 ?? null,
      isCity: true,
    },
    ...section.nearby.map((locality) => ({
      name: t('{0}, lângă oraș', '{0}, near the city', locality.name),
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
    ? `<div class="inv-diff"><span>${t('Apartamentul tipic din anunțuri: {0} m², {1}', 'Typical listed flat: {0} m², {1}', formatNumber(sale.typical.area_m2), formatEuro(sale.typical.price_eur))}</span></div>`
    : '';
  const title =
    sale.p25_eur_m2 != null && sale.p75_eur_m2 != null
      ? t(
          'Jumătate din apartamente se cer între {0} și {1} €/m²',
          'Half of flats are listed between {0} and {1} €/m²',
          formatNumber(sale.p25_eur_m2),
          formatNumber(sale.p75_eur_m2),
        )
      : t(
          'Prețul cerut din mijloc: {0} €/m²',
          'Median asking price: {0} €/m²',
          formatNumber(Math.round(sale.median_eur_m2)),
        );
  return `<section class="card ac invP"><div class="ac-h"><div>${eyebrow(t('Preț cerut pe metru pătrat', 'Asking price per square metre'))}<h3>${esc(title)}</h3></div></div><div class="inv-rows">${items.map((item) => intervalRow(report.locale, item, scale)).join('')}</div>${typical}<div class="ai-leg inv-leg"><span><i class="b"></i>${t('intervalul tipic', 'typical range')}</span><span><i class="m"></i>${t('prețul din mijloc', 'median price')}</span></div></section>`;
}

function homeCard(locale: ReportLocale, section: Investment, sale: Sale): string {
  const { t, formatNumber, formatEuro } = reportFormat(locale);
  const area = section.declared.area_m2;
  if (sale.estimate_eur == null || area === null) {
    return `<section class="card ac invE">${eyebrow(t('Pentru apartamentul tău', 'For your flat'))}<p class="hint">${t('Fără suprafața apartamentului putem arăta doar prețul cerut pe metru pătrat.', 'Without the size of the flat, we can only show the asking price per square metre.')}</p></section>`;
  }
  const bounds =
    sale.estimate_low_eur != null && sale.estimate_high_eur != null
      ? `<small>${t('între {0} și {1}', 'between {0} and {1}', formatNumber(sale.estimate_low_eur), formatEuro(sale.estimate_high_eur))}</small>`
      : '';
  const rentValue = section.rent?.estimate_eur ?? section.rent?.median_eur ?? null;
  const rent =
    rentValue === null
      ? ''
      : `<div class="inv-big g"><span>${t('Chirie cerută estimată{0}', 'Estimated asking rent{0}', section.rent?.is_example ? ` ${exampleTag(locale)}` : '')}</span><b>${t('circa {0} ', 'about {0} ', formatEuro(rentValue))}<i>${t('pe lună', 'per month')}</i></b></div>`;
  return `<section class="card ac invE">${eyebrow(t('Pentru apartamentul tău', 'For your flat'))}<div class="inv-sl"><div class="inv-sl-h"><span>${t('Suprafața declarată', 'Declared floor area')}</span><b>${formatNumber(area)} m²</b></div></div><div class="inv-big"><span>${t('Preț cerut estimat', 'Estimated asking price')}</span><b>${t('circa {0}', 'about {0}', formatEuro(sale.estimate_eur))}</b>${bounds}</div>${rent}</section>`;
}

function yieldCard(report: ReportData, section: Investment): string {
  const { t, formatNumber } = reportFormat(report.locale);
  const value = section.yield.gross_pct;
  if (value === null) return '';
  const width = Math.min(100, (value / YIELD_SCALE_PCT) * 100).toFixed(1);
  return `<section class="card ac invY"><div class="ac-h"><div>${eyebrow(t('Randament brut pe an', 'Gross annual yield'))}<h3>${t('Chiria pe un an înseamnă {0}% din preț', "A year's rent is {0}% of the price", formatNumber(value, 1))}</h3></div></div><div class="inv-yb z"><span>${esc(report.city.name)}${section.yield.is_example ? ` ${exampleTag(report.locale)}` : ''}</span><div><i style="width:${width}%"></i></div><b>${formatNumber(value, 1)}%</b></div><p class="fqx-foot">${icon('info')}<span>${t('Chiria pe 12 luni împărțită la preț, înainte de taxe, reparații și luni fără chiriaș.', "Twelve months' rent divided by the price, before tax, repairs and vacant periods.")}</span></p></section>`;
}

function historyCard(locale: ReportLocale, section: Investment): string {
  const { t, formatNumber, shortMonth, formatEuro } = reportFormat(locale);
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
  const direction =
    change > 0
      ? t('a urcat cu', 'rose by')
      : change < 0
        ? t('a scăzut cu', 'fell by')
        : t('a rămas la fel, cu', 'changed by');
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  const area = section.declared.area_m2;
  const percent = t(
    '{0}{1}% în {2} luni',
    '{0}{1}% over {2} months',
    sign,
    formatNumber(Math.abs((change / first.median_eur_m2) * 100), 1),
    String(months.length - 1),
  );
  const delta =
    area === null
      ? `<div class="inv-big g"><span>${t('Față de {0}', 'Compared with {0}', esc(shortMonth(first.period)))}</span><b>${sign} ${formatNumber(Math.abs(change))} €/m²</b><small>${percent}</small></div>`
      : `<div class="inv-big g"><span>${t('Pentru {0} m², față de {1}', 'For {0} m², compared with {1}', formatNumber(area), esc(shortMonth(first.period)))}</span><b>${sign} ${formatEuro(Math.round(Math.abs(change * area) / 100) * 100)}</b><small>${percent}</small></div>`;
  return `<section class="card ac invX"><div class="ac-h"><div>${eyebrow(t('Ultimele {0} luni', 'Last {0} months', String(months.length)))}<h3>${t('Din {0}, prețul cerut {1} {2} €/m²', 'Since {0}, the asking price {1} {2} €/m²', esc(shortMonth(first.period)), direction, formatNumber(Math.abs(change)))}</h3></div></div><div class="inv-x1"><div class="inv-hist">${bars}</div>${delta}</div></section>`;
}

function sourcesCard(locale: ReportLocale, section: Investment): string {
  const { t, formatDate, formatMonth } = reportFormat(locale);
  const hasExample = section.rent?.is_example === true || section.yield.is_example === true;
  const items = section.sources
    .map((source) => {
      const when = source.observed_on ? formatDate(source.observed_on) : formatMonth(source.period);
      const link = source.url
        ? `<a class="inv-lnk" href="${esc(source.url)}">${esc(new URL(source.url).hostname.replace(/^www\./, ''))}${icon('arr')}</a>`
        : '';
      return `<li><span class="zg-dot" style="background:${COLOR}"></span><span class="zg-src-t"><b>${esc(labelFor(locale, MARKET_SOURCES, source.source))}, ${esc(when)}</b>${source.label ? `<small>${esc(labelFor(locale, MARKET_SOURCE_DETAILS, source.label))}</small>` : ''}</span>${link}</li>`;
    })
    .join('');
  const reference = section.reference_date ? ` · ${formatDate(section.reference_date)}` : '';
  return `<section class="card ac invSrc">${eyebrow(t('Sursa cifrelor{0}', 'Data sources{0}', reference))}<ul class="zg-src">${items}</ul><p class="fqx-foot">${icon('info')}<span>${t('Sunt prețuri cerute în anunțuri, nu prețuri de vânzare.{0}', 'These are advertised asking prices, not sale prices.{0}', hasExample ? t(' Cifrele marcate „exemplu” se înlocuiesc la primul import.', ' Figures marked “example” will be replaced after the first import.') : '')}</span></p></section>`;
}

export const investmentChapter: ChapterBuilder = (report) => {
  const { t, formatNumber, formatEuro } = reportFormat(report.locale);
  const section = report.sections.investment;
  const label = t(
    'Investiție · context, nu intră în scor',
    'Investment · context, not part of the score',
  );
  const sale = section?.sale ?? null;
  if (!section || !sale) {
    return {
      html: chapter(
        chapterHead(report.locale, {
          eyebrow: label,
          color: COLOR,
          title: t(
            'Încă nu avem date de piață pentru această adresă',
            'Market data is not yet available for this address',
          ),
        }) +
          footnote(
            t(
              'Capitolul arată prețul cerut pe metru pătrat, chiria și randamentul când avem date de piață pentru oraș.',
              'This chapter shows the asking price per square metre, rent and yield when market data is available for the city.',
            ),
          ),
      ),
      maps: [],
    };
  }
  const isCityWide = CITY_WIDE.has(sale.precision);
  const area = section.declared.area_m2;
  const head = chapterHead(report.locale, {
    eyebrow: label,
    color: COLOR,
    precision: isCityWide ? t('oraș', 'citywide') : t('în jurul adresei', 'around the address'),
    title: t(
      '{0} se cer în jur de {1} € pe metru pătrat',
      '{0}, the asking price is about {1} € per square metre',
      isCityWide
        ? t('În {0}', 'In {0}', report.city.name)
        : t('În jurul adresei', 'Around the address'),
      formatNumber(sale.median_eur_m2),
    ),
    lead:
      area !== null && sale.estimate_eur != null
        ? t(
            'Pentru {0} m², cam {1}, preț cerut.',
            'For {0} m², an asking price of about {1}.',
            formatNumber(area),
            formatEuro(sale.estimate_eur),
          )
        : t(
            'Preț cerut în anunțuri, nu preț de vânzare.',
            'Advertised asking price, not a sale price.',
          ),
  });
  return {
    html: chapter(
      `${head}<div class="invA">${priceCard(report, section, sale)}<div class="inv-col">${homeCard(report.locale, section, sale)}${yieldCard(report, section)}</div></div>${historyCard(report.locale, section)}${sourcesCard(report.locale, section)}`,
    ),
    maps: [],
  };
};
