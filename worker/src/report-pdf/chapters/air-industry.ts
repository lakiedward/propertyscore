import type { ChapterBuilder } from '../chapter.ts';
import { card, chapter, chapterHead, note, rows, scoreCard } from '../components.ts';
import { esc, formatDistance, formatNumber, plural, shortMonth } from '../format.ts';
import { INDUSTRY_IMPACTS, INDUSTRY_SECTORS } from '../labels.ts';
import type { ReportData } from '../report-data.ts';

type Air = NonNullable<ReportData['sections']['air']>;
type Industry = NonNullable<ReportData['sections']['industry']>;

const CHART_HEIGHT_MM = 38;
const OVER_LIMIT = '#5B4A9E';
const UNDER_LIMIT = '#B9B0DC';
const LISTED_SITES = 6;

function monthsChart(air: Air): string {
  const values = air.pm25_monthly.map((value) => value ?? 0);
  const limit = air.limits.pm25;
  const peak = Math.max(...values, limit) * 1.15;
  const columns = air.pm25_monthly.map((value) => {
    if (value === null) return '<div class="col">–</div>';
    const height = ((value / peak) * CHART_HEIGHT_MM).toFixed(1);
    return `<div class="col">${formatNumber(value)}<i style="height:${height}mm;--swatch:${value > limit ? OVER_LIMIT : UNDER_LIMIT}"></i></div>`;
  });
  const labels = air.months.map((month) => `<span>${esc(shortMonth(month))}</span>`);
  const limitLine = `<span class="limit" style="bottom:${((limit / peak) * CHART_HEIGHT_MM).toFixed(1)}mm"></span>`;
  const over = air.months_over_limit.pm25;
  const lead =
    over === null
      ? ''
      : `<p class="lead" style="font-size:9pt">${plural(over, 'lună', 'luni', 'de luni')} din 12 peste limita UE din 2030 (${formatNumber(limit)} µg/m³).${air.pm25_annual === null ? '' : ` Media pe an: ${formatNumber(air.pm25_annual, 1)} µg/m³.`}</p>`;
  return card(
    'Particule fine (PM2,5), lună de lună',
    `<div class="columns-chart" style="height:${String(CHART_HEIGHT_MM + 5)}mm">${limitLine}${columns.join('')}</div><div class="columns-labels">${labels.join('')}</div>${lead}`,
    'Praful din aer, lună cu lună',
  );
}

function sitesCard(industry: Industry): string {
  const sites = [...industry.sites]
    .sort((left, right) => left.distance_m - right.distance_m)
    .slice(0, LISTED_SITES);
  const body =
    sites.length === 0
      ? note(`Nicio instalație raportată pe o rază de ${formatDistance(industry.radius_m)}.`)
      : rows(
          sites.map((site) => ({
            title: site.name,
            detail: [
              INDUSTRY_SECTORS[site.sector_code] ?? site.sector_code,
              ...site.impact_codes.map((code) => INDUSTRY_IMPACTS[code] ?? code),
            ].join(' · '),
            value: formatDistance(site.distance_m),
            dot: site.impact_codes.includes('air') ? '#A63A24' : '#52685B',
          })),
        );
  return card('Cele mai apropiate instalații din registrul european', body, 'Industria din jur');
}

function title(air: Air | null, industry: Industry | null): string {
  const airPart =
    air?.verdict_code === 'clean_all_year'
      ? 'Aer curat tot anul'
      : air?.verdict_code === 'winter_peaks'
        ? 'Aer bun vara, mai încărcat iarna'
        : air?.verdict_code === 'above_limit_most_year'
          ? 'Aer peste limita UE în cea mai mare parte a anului'
          : 'Aer ca în tot orașul';
  if (!industry) return airPart;
  if (industry.nearest_m === null) return `${airPart}, nicio fabrică în registru aproape`;
  return `${airPart}, fabrici la peste ${formatDistance(industry.nearest_m)}`;
}

export const airIndustryChapter: ChapterBuilder = (report) => {
  const { air, industry } = report.sections;
  const airScore = report.categories.air.score;
  const industryScore = report.categories.industry.score;
  const eyebrow = [
    airScore === null ? 'Aer · fără date' : `Aer · ${String(Math.round(airScore))} / 100`,
    industryScore === null
      ? 'Industrie · fără date'
      : `Industrie · ${String(Math.round(industryScore))} / 100`,
  ].join('   ');
  const head = chapterHead({
    eyebrow,
    precision: 'aer la nivel de oraș, industrie la adresă',
    title: title(air, industry),
  });
  const details = [air ? monthsChart(air) : '', industry ? sitesCard(industry) : ''].filter(
    Boolean,
  );
  const year = industry?.source.reporting_year;
  const sourceNote = [
    air ? 'Aer: model european Copernicus corectat cu stațiile din oraș.' : '',
    year ? `Industrie: registrul industrial european, raportările din ${String(year)}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return {
    html: chapter(
      head +
        (details.length === 2
          ? `<div class="grid cols-2">${details.join('')}</div>`
          : details.join('')) +
        (sourceNote ? note(sourceNote) : '') +
        scoreCard('air', report, { label: 'Aer' }) +
        scoreCard('industry', report, { label: 'Industrie' }),
    ),
    maps: [],
  };
};
