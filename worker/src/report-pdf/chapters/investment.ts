import {
  estimateForArea,
  historyRange,
  investmentSources,
  isCityWide,
  rentForArea,
  sampleKind,
  yieldScope,
  type MarketCountKind,
} from '../../report/investment-contract.ts';
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
  countKind: MarketCountKind;
  median: number;
  low: number | null;
  high: number | null;
  isCity: boolean;
};

const COLOR = CONTEXT_THEME.investment.color;
const SCALE_MARGIN = 0.25;
const YIELD_SCALE_PCT = 8;
const HISTORY_FLOOR = 0.4;

function decimal(locale: ReportLocale, value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(locale === 'ro' ? 'ro-RO' : 'en-GB', {
    maximumFractionDigits,
  }).format(value);
}

function exampleTag(locale: ReportLocale): string {
  const { t } = reportFormat(locale);
  return `<span class="inv-ex">${t('exemplu', 'example')}</span>`;
}

function eyebrow(text: string): string {
  return `<div class="eyebrow" style="color:${COLOR}">${esc(text)}</div>`;
}

function sampleCount(locale: ReportLocale, count: number, kind: MarketCountKind): string {
  const { plural } = reportFormat(locale);
  return kind === 'apartments'
    ? plural(count, ['apartament', 'flat'], 'apartamente', ['de apartamente', 'flats'])
    : plural(count, ['ofertă', 'listing'], 'oferte', ['de oferte', 'listings']);
}

function intervalRow(
  locale: ReportLocale,
  item: Interval,
  scale: { min: number; max: number },
): string {
  const { formatNumber } = reportFormat(locale);
  const position = (value: number) => ((value - scale.min) / (scale.max - scale.min)) * 100;
  const count =
    item.count === null ? '' : `<small>${sampleCount(locale, item.count, item.countKind)}</small>`;
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
  const cityWide = isCityWide(sale.precision);
  const items: Interval[] = [
    {
      name: cityWide
        ? t('{0}, tot orașul', '{0}, citywide', report.city.name)
        : t('În jurul adresei', 'Around the address'),
      count: sale.count ?? null,
      countKind: sampleKind(sale),
      median: sale.median_eur_m2,
      low: sale.p25_eur_m2 ?? null,
      high: sale.p75_eur_m2 ?? null,
      isCity: true,
    },
    ...section.nearby.map((locality) => ({
      name: t('{0}, lângă oraș', '{0}, near the city', locality.name),
      count: locality.count ?? null,
      countKind: sampleKind(locality),
      median: locality.median_eur_m2,
      low: locality.p25_eur_m2 ?? null,
      high: locality.p75_eur_m2 ?? null,
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
  if (area === null) {
    return `<section class="card ac invE">${eyebrow(t('Pentru apartamentul tău', 'For your flat'))}<p class="hint">${t('Fără suprafața apartamentului putem arăta doar prețul cerut pe metru pătrat.', 'Without the size of the flat, we can only show the asking price per square metre.')}</p></section>`;
  }
  const { price, low, high } = estimateForArea(section, sale, area);
  const bounds =
    low !== null && high !== null
      ? `<small>${t('între {0} și {1}', 'between {0} and {1}', formatNumber(low), formatEuro(high))}</small>`
      : '';
  const rentValue = rentForArea(section, area);
  const rent =
    rentValue === null
      ? ''
      : `<div class="inv-big g"><span>${t('Chirie cerută estimată{0}', 'Estimated asking rent{0}', section.rent?.is_example ? ` ${exampleTag(locale)}` : '')}</span><b>${t('circa {0} ', 'about {0} ', formatEuro(rentValue))}<i>${t('pe lună', 'per month')}</i></b></div>`;
  return `<section class="card ac invE">${eyebrow(t('Pentru apartamentul tău', 'For your flat'))}<div class="inv-sl"><div class="inv-sl-h"><span>${t('Suprafața declarată', 'Declared floor area')}</span><b>${decimal(locale, area)} m²</b></div></div><div class="inv-big"><span>${t('Preț cerut estimat', 'Estimated asking price')}</span><b>${t('circa {0}', 'about {0}', formatEuro(price))}</b>${bounds}</div>${rent}</section>`;
}

function sourceName(locale: ReportLocale, code: string): string {
  return labelFor(locale, MARKET_SOURCES, code);
}

function yieldCard(
  locale: ReportLocale,
  cityName: string,
  section: Investment,
  sale: Sale,
): string {
  const { t, formatMonth } = reportFormat(locale);
  const value = section.yield.gross_pct;
  if (value === null) return '';
  const width = Math.min(100, (value / YIELD_SCALE_PCT) * 100).toFixed(1);
  const basis = section.yield.basis;
  const scopeLabel = {
    city: cityName,
    address: t('În jurul adresei', 'Around the address'),
    addressSaleCityRent: t(
      'Preț în jurul adresei · chirie la nivelul orașului',
      'Asking price around the address · citywide rent',
    ),
    citySaleAddressRent: t(
      'Preț la nivelul orașului · chirie în jurul adresei',
      'Citywide asking price · rent around the address',
    ),
    unknown: t('Date de piață', 'Market data'),
  }[yieldScope(section)];
  const percent = `${decimal(locale, value, 1)}%`;
  const title =
    !basis && sale.precision === 'city_statistics' && !section.yield.is_example
      ? t(
          'Randament brut: {0} (baza nu este disponibilă)',
          'Gross yield: {0} (calculation inputs not available)',
          percent,
        )
      : t('Chiria pe un an înseamnă {0} din preț', "A year's rent is {0} of the price", percent);
  const calculation = basis
    ? `<p class="hint">${t(
        'Calcul: 12 × {0} €/m² pe lună ({1}, {2}) ÷ {3} €/m² ({4}, {5}).',
        'Calculation: 12 × {0} €/m² per month ({1}, {2}) ÷ {3} €/m² ({4}, {5}).',
        decimal(locale, basis.rent_eur_m2),
        esc(sourceName(locale, basis.rent_source.source)),
        esc(formatMonth(basis.rent_source.period)),
        decimal(locale, basis.sale_eur_m2),
        esc(sourceName(locale, basis.sale_source.source)),
        esc(formatMonth(basis.sale_source.period)),
      )}</p>`
    : '';
  return `<section class="card ac invY"><div class="ac-h"><div>${eyebrow(t('Randament brut pe an', 'Gross annual yield'))}<h3>${title}</h3></div></div><div class="inv-yb z"><span>${esc(scopeLabel)}${section.yield.is_example ? ` ${exampleTag(locale)}` : ''}</span><div><i style="width:${width}%"></i></div><b>${percent}</b></div>${calculation}<p class="fqx-foot">${icon('info')}<span>${t('Chiria pe 12 luni împărțită la preț, înainte de taxe, reparații și luni fără chiriaș.', "Twelve months' rent divided by the price, before tax, repairs and vacant periods.")}</span></p></section>`;
}

function historyCard(locale: ReportLocale, section: Investment): string {
  const { t, formatNumber, shortMonth, formatEuro, formatMonth, plural } = reportFormat(locale);
  const range = historyRange(section.history?.months ?? []);
  if (!range) return '';
  const { first, last, ordered: months, perM2: change } = range;
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
    '{0}{1}% în {2}',
    '{0}{1}% over {2}',
    sign,
    formatNumber(Math.abs(range.percent), 1),
    plural(range.monthsSpan, ['lună', 'month'], 'luni', ['de luni', 'months']),
  );
  const delta =
    area === null
      ? `<div class="inv-big g"><span>${t('Față de {0}', 'Compared with {0}', esc(shortMonth(first.period)))}</span><b>${sign} ${formatNumber(Math.abs(change))} €/m²</b><small>${percent}</small></div>`
      : `<div class="inv-big g"><span>${t('Pentru {0} m², față de {1}', 'For {0} m², compared with {1}', decimal(locale, area), esc(shortMonth(first.period)))}</span><b>${sign} ${formatEuro(Math.round(Math.abs(change * area) / 100) * 100)}</b><small>${percent}</small></div>`;
  return `<section class="card ac invX"><div class="ac-h"><div>${eyebrow(t('Istoric · {0} – {1}', 'History · {0} – {1}', formatMonth(first.period), formatMonth(last.period)))}<h3>${t('Din {0}, prețul cerut {1} {2} €/m²', 'Since {0}, the asking price {1} {2} €/m²', esc(shortMonth(first.period)), direction, formatNumber(Math.abs(change)))}</h3></div></div><div class="inv-x1"><div class="inv-hist">${bars}</div>${delta}</div></section>`;
}

function sourcesCard(locale: ReportLocale, section: Investment, marketName: string): string {
  const { t, formatDate, formatMonth } = reportFormat(locale);
  const hasExample = section.rent?.is_example === true || section.yield.is_example === true;
  const items = investmentSources(section)
    .map(({ source, details }) => {
      const period = formatMonth(source.period);
      const when = source.observed_on ? ` · ${formatDate(source.observed_on)}` : '';
      const link = source.url
        ? `<a class="inv-lnk" href="${esc(source.url)}">${esc(new URL(source.url).hostname.replace(/^www\./, ''))}${icon('arr')}</a>`
        : '';
      const descriptions = details.map(({ role, count, countKind, place }) => {
        const labels = {
          sale: t('{0} · vânzare', '{0} · sale', place ?? marketName),
          rent: t('{0} · închiriere', '{0} · rent', place ?? marketName),
          history: t('Istoricul prețurilor cerute', 'Asking price history'),
          yield_sale: t('Prețul folosit pentru randament', 'Price used to calculate yield'),
          yield_rent: t('Chiria folosită pentru randament', 'Rent used to calculate yield'),
        };
        return count === null
          ? labels[role]
          : `${labels[role]} · ${sampleCount(locale, count, countKind)}`;
      });
      if (!descriptions.length && source.label) {
        descriptions.push(labelFor(locale, MARKET_SOURCE_DETAILS, source.label));
      }
      return `<li><span class="zg-dot" style="background:${COLOR}"></span><span class="zg-src-t"><b>${esc(sourceName(locale, source.source))}, ${esc(period + when)}</b>${descriptions.map((detail) => `<small>${esc(detail)}</small>`).join('')}</span>${link}</li>`;
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
  const cityWide = isCityWide(sale.precision);
  const radiusLabel = t('În jurul adresei', 'Around the address');
  const marketName = cityWide ? report.city.name : radiusLabel;
  const area = section.declared.area_m2;
  const head = chapterHead(report.locale, {
    eyebrow: label,
    color: COLOR,
    precision: cityWide ? t('oraș', 'citywide') : t('în jurul adresei', 'around the address'),
    title: t(
      '{0} se cer în jur de {1} € pe metru pătrat',
      '{0}, the asking price is about {1} € per square metre',
      cityWide ? t('În {0}', 'In {0}', report.city.name) : radiusLabel,
      formatNumber(sale.median_eur_m2),
    ),
    lead:
      area !== null
        ? t(
            'Pentru {0} m², cam {1}, preț cerut.',
            'For {0} m², an asking price of about {1}.',
            decimal(report.locale, area),
            formatEuro(estimateForArea(section, sale, area).price),
          )
        : t(
            'Preț cerut în anunțuri, nu preț de vânzare.',
            'Advertised asking price, not a sale price.',
          ),
  });
  return {
    html: chapter(
      `${head}<div class="invA">${priceCard(report, section, sale)}<div class="inv-col">${homeCard(report.locale, section, sale)}${yieldCard(report.locale, report.city.name, section, sale)}</div></div>${historyCard(report.locale, section)}${sourcesCard(report.locale, section, marketName)}`,
    ),
    maps: [],
  };
};
