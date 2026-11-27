import type { ChapterBuilder } from '../chapter.ts';
import { chapter, chapterSources, footnote, scoreCard, sourceDate } from '../components.ts';
import { esc, reportFormat, labelFor } from '../format.ts';
import { icon } from '../icons.ts';
import { INDUSTRY_IMPACTS, INDUSTRY_SECTORS } from '../labels.ts';
import type { ReportData, ReportLocale } from '../report-data.ts';
import { CATEGORY_THEME } from '../theme.ts';

type Air = NonNullable<ReportData['sections']['air']>;
type Industry = NonNullable<ReportData['sections']['industry']>;

const LISTED_SITES = 6;
const CHART_HEADROOM = 1.2;
const AIR_IMPACT = '#C2410C';

function monthsCard(locale: ReportLocale, air: Air): string {
  const { t, formatNumber, shortMonth, plural } = reportFormat(locale);
  const color = CATEGORY_THEME.air.color;
  const limit = air.limits.pm25;
  const peak = Math.max(...air.pm25_monthly.map((value) => value ?? 0), limit) * CHART_HEADROOM;
  const bars = air.pm25_monthly
    .map((value) => {
      if (value === null) return '<span><em>–</em><i style="height:0"></i></span>';
      return `<span class="${value > limit ? 'w' : ''}"><em>${formatNumber(value)}</em><i style="height:${((value / peak) * 100).toFixed(1)}%"></i></span>`;
    })
    .join('');
  const axis = air.months.map((month) => `<span>${esc(shortMonth(month))}</span>`).join('');
  const over = air.months_over_limit.pm25;
  const title =
    over === null
      ? t('Praful fin din aer, pe 12 luni', 'Fine particulate matter over 12 months')
      : over === 0
        ? t('Nicio lună peste limita UE din 2030', 'No month above the 2030 EU limit')
        : t(
            '{0} din 12 peste limita UE din 2030',
            '{0} out of 12 above the 2030 EU limit',
            plural(over, ['lună', 'month'], 'luni', ['de luni', 'months']),
          );
  const annual =
    air.pm25_annual === null
      ? ''
      : `<p class="fqx-foot">${icon('info')}<span>${t('Media pe an: {0} µg/m³{1}.', 'Annual average: {0} µg/m³{1}.', formatNumber(air.pm25_annual, 1), air.city_avg.pm25 === null ? '' : t(', față de {0} media orașului', ', compared with the city average of {0}', formatNumber(air.city_avg.pm25, 1)))}</span></p>`;
  return `<section class="card ac aiM"><div class="ac-h"><div><div class="eyebrow" style="color:${color}">${t('Praful din aer, lună cu lună', 'Air pollution, month by month')}</div><h3>${esc(title)}</h3></div><div class="ai-leg"><span><i></i>${t('PM2,5, µg/m³', 'PM2.5, µg/m³')}</span><span><i class="l"></i>${t('limita UE din 2030', '2030 EU limit')}</span></div></div><div class="ai-ch"><div class="ai-bars">${bars}<b class="ai-lim" style="bottom:${((limit / peak) * 100).toFixed(1)}%"><span>${formatNumber(limit)}</span></b></div><div class="ai-ax">${axis}</div></div>${annual}</section>`;
}

function sitesCard(locale: ReportLocale, industry: Industry): string {
  const { t, formatDistance } = reportFormat(locale);
  const color = CATEGORY_THEME.industry.color;
  const sites = [...industry.sites]
    .sort((left, right) => left.distance_m - right.distance_m)
    .slice(0, LISTED_SITES);
  const body =
    sites.length === 0
      ? `<p class="hint">${t('Nicio instalație raportată pe o rază de {0}.', 'No facilities reported within {0}.', formatDistance(industry.radius_m))}</p>`
      : `<ul class="zg-src ai-ind">${sites
          .map((site) => {
            const affectsAir = site.impact_codes.includes('air');
            const detail = [
              labelFor(locale, INDUSTRY_SECTORS, site.sector_code),
              ...site.impact_codes.map((code) => labelFor(locale, INDUSTRY_IMPACTS, code)),
            ].join(' · ');
            const [value = '', unit = ''] = formatDistance(site.distance_m).split(' ');
            return `<li><span class="zg-dot" style="background:${affectsAir ? AIR_IMPACT : color}"></span><span class="zg-src-t"><b>${esc(site.name)}</b><small>${esc(detail)}</small></span><span class="zg-src-m"><b>${value}</b> ${unit}</span></li>`;
          })
          .join('')}</ul>`;
  return `<section class="card ac aiI"><div class="eyebrow" style="color:${color}">${t('Industria din jur', 'Nearby industry')}</div><h3>${t('Cele mai apropiate instalații din registrul european', 'The closest facilities in the European register')}</h3>${body}</section>`;
}

function title(locale: ReportLocale, air: Air | null, industry: Industry | null): string {
  const { t, formatDistance } = reportFormat(locale);
  if (!air) {
    if (!industry)
      return t(
        'Datele despre aer și industrie nu sunt disponibile pentru această adresă',
        'Air quality and industry data are not available for this address',
      );
    return industry.nearest_m === null
      ? t('Nicio fabrică în registru aproape', 'No registered industrial facilities nearby')
      : t(
          'Fabrici la peste {0}',
          'Industrial facilities more than {0} away',
          formatDistance(industry.nearest_m),
        );
  }
  const airPart =
    air.verdict_code === 'clean_all_year'
      ? t('Aer curat tot anul', 'Clean air all year')
      : air.verdict_code === 'winter_peaks'
        ? t('Aer bun vara, mai încărcat iarna', 'Cleaner air in summer, more pollution in winter')
        : air.verdict_code === 'above_limit_most_year'
          ? t(
              'Aer peste limita UE în cea mai mare parte a anului',
              'Air pollution above the EU limit for most of the year',
            )
          : t('Aer ca în tot orașul', 'Air quality reflects the city as a whole');
  if (!industry) return airPart;
  if (industry.nearest_m === null)
    return t(
      '{0}, nicio fabrică în registru aproape',
      '{0}, no registered industrial facilities nearby',
      airPart,
    );
  return t(
    '{0}, fabrici la peste {1}',
    '{0}, industrial facilities more than {1} away',
    airPart,
    formatDistance(industry.nearest_m),
  );
}

function eyebrowPart(
  locale: ReportLocale,
  name: string,
  score: number | null,
  color: string,
): string {
  const { t } = reportFormat(locale);
  return `<span style="color:${color}">${name} · ${score === null ? t('fără date', 'no data') : `${String(Math.round(score))} / 100`}</span>`;
}

export const airIndustryChapter: ChapterBuilder = (report) => {
  const { t, formatDistance, longDate } = reportFormat(report.locale);
  const { air, industry } = report.sections;
  const airTheme = CATEGORY_THEME.air;
  const industryTheme = CATEGORY_THEME.industry;
  const lead = [
    !air && industry
      ? t(
          'Datele despre aer nu sunt disponibile pentru această adresă.',
          'Air quality data is not available for this address.',
        )
      : '',
    air && !industry
      ? t(
          'Datele despre industrie nu sunt disponibile pentru această adresă.',
          'Industry data is not available for this address.',
        )
      : '',
    industry?.nearest_m != null
      ? t(
          'Cea mai apropiată instalație industrială e la {0}.',
          'The closest industrial facility is {0} away.',
          formatDistance(industry.nearest_m),
        )
      : '',
  ]
    .filter(Boolean)
    .join(' ');
  const precision =
    air && industry
      ? `<span class="acc" style="--c:${airTheme.color}"><i></i>${t('Precizie: aer la nivel de oraș, industrie la adresă', 'Precision: citywide air data, address-level industry data')}</span>`
      : '';
  const head = `<div class="ch-head" style="--c:${airTheme.color}"><div class="eyebrow">${eyebrowPart(report.locale, t('Aer', 'Air'), report.categories.air.score, airTheme.color)}${eyebrowPart(report.locale, t('Industrie', 'Industry'), report.categories.industry.score, industryTheme.color)}${precision}</div><h2>${esc(title(report.locale, air, industry))}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div>`;
  const cards = `${air ? monthsCard(report.locale, air) : ''}${industry ? sitesCard(report.locale, industry) : ''}`;
  const period = sourceDate(report, 'cams');
  const year = industry?.source.reporting_year;
  const observedAt = industry?.source.legacy_observed_at;
  const note = [
    air
      ? t(
          'Aer: modelul european Copernicus, corectat cu stațiile din oraș{0}.',
          'Air: European Copernicus model, adjusted using city monitoring stations{0}.',
          period ? `, ${period}` : '',
        )
      : '',
    observedAt
      ? t(
          'Industrie: registrul a fost copiat la {0} pentru tranziție; copia nu reprezintă datele istorice folosite la calculul scorurilor.',
          'Industry: register copied on {0} for the transition; this is not historical data used to calculate the scores.',
          longDate(observedAt),
        )
      : year
        ? t(
            'Industrie: registrul industrial european, raportările din {0}.',
            'Industry: European industrial register, reporting year {0}.',
            String(year),
          )
        : '',
  ]
    .filter(Boolean)
    .join(' ');
  return {
    html: chapter(
      `${head}${cards ? `<div class="aiA">${cards}</div>` : ''}${note ? footnote(note) : ''}<div class="sfB-rest ai-rest">${scoreCard('air', report, { label: t('Aer', 'Air') })}${scoreCard('industry', report, { label: t('Industrie', 'Industry') })}${chapterSources(report, ['air', 'industry'])}</div>`,
    ),
    maps: [],
  };
};
