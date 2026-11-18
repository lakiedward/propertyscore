import type { ChapterBuilder } from '../chapter.ts';
import { chapter, chapterSources, footnote, scoreCard, sourceDate } from '../components.ts';
import { esc, formatDistance, formatNumber, plural, shortMonth } from '../format.ts';
import { icon } from '../icons.ts';
import { INDUSTRY_IMPACTS, INDUSTRY_SECTORS } from '../labels.ts';
import type { ReportData } from '../report-data.ts';
import { CATEGORY_THEME } from '../theme.ts';

type Air = NonNullable<ReportData['sections']['air']>;
type Industry = NonNullable<ReportData['sections']['industry']>;

const LISTED_SITES = 6;
const CHART_HEADROOM = 1.2;
const AIR_IMPACT = '#C2410C';

function monthsCard(air: Air): string {
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
      ? 'Praful fin din aer, pe 12 luni'
      : over === 0
        ? 'Nicio lună peste limita UE din 2030'
        : `${plural(over, 'lună', 'luni', 'de luni')} din 12 peste limita UE din 2030`;
  const annual =
    air.pm25_annual === null
      ? ''
      : `<p class="fqx-foot">${icon('info')}<span>Media pe an: ${formatNumber(air.pm25_annual, 1)} µg/m³${air.city_avg.pm25 === null ? '' : `, față de ${formatNumber(air.city_avg.pm25, 1)} media orașului`}.</span></p>`;
  return `<section class="card ac aiM"><div class="ac-h"><div><div class="eyebrow" style="color:${color}">Praful din aer, lună cu lună</div><h3>${esc(title)}</h3></div><div class="ai-leg"><span><i></i>PM2,5, µg/m³</span><span><i class="l"></i>limita UE din 2030</span></div></div><div class="ai-ch"><div class="ai-bars">${bars}<b class="ai-lim" style="bottom:${((limit / peak) * 100).toFixed(1)}%"><span>${formatNumber(limit)}</span></b></div><div class="ai-ax">${axis}</div></div>${annual}</section>`;
}

function sitesCard(industry: Industry): string {
  const color = CATEGORY_THEME.industry.color;
  const sites = [...industry.sites]
    .sort((left, right) => left.distance_m - right.distance_m)
    .slice(0, LISTED_SITES);
  const body =
    sites.length === 0
      ? `<p class="hint">Nicio instalație raportată pe o rază de ${formatDistance(industry.radius_m)}.</p>`
      : `<ul class="zg-src ai-ind">${sites
          .map((site) => {
            const affectsAir = site.impact_codes.includes('air');
            const detail = [
              INDUSTRY_SECTORS[site.sector_code] ?? site.sector_code,
              ...site.impact_codes.map((code) => INDUSTRY_IMPACTS[code] ?? code),
            ].join(' · ');
            const [value = '', unit = ''] = formatDistance(site.distance_m).split(' ');
            return `<li><span class="zg-dot" style="background:${affectsAir ? AIR_IMPACT : color}"></span><span class="zg-src-t"><b>${esc(site.name)}</b><small>${esc(detail)}</small></span><span class="zg-src-m"><b>${value}</b> ${unit}</span></li>`;
          })
          .join('')}</ul>`;
  return `<section class="card ac aiI"><div class="eyebrow" style="color:${color}">Industria din jur</div><h3>Cele mai apropiate instalații din registrul european</h3>${body}</section>`;
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

function eyebrowPart(name: string, score: number | null, color: string): string {
  return `<span style="color:${color}">${name} · ${score === null ? 'fără date' : `${String(Math.round(score))} / 100`}</span>`;
}

export const airIndustryChapter: ChapterBuilder = (report) => {
  const { air, industry } = report.sections;
  const airTheme = CATEGORY_THEME.air;
  const industryTheme = CATEGORY_THEME.industry;
  const lead = industry?.nearest_m
    ? `Cea mai apropiată instalație industrială e la ${formatDistance(industry.nearest_m)}.`
    : '';
  const head = `<div class="ch-head"><div class="eyebrow">${eyebrowPart('Aer', report.categories.air.score, airTheme.color)}${eyebrowPart('Industrie', report.categories.industry.score, industryTheme.color)}<span class="acc" style="--c:${airTheme.color}"><i></i>Precizie: aer la nivel de oraș, industrie la adresă</span></div><h2>${esc(title(air, industry))}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div>`;
  const cards = `${air ? monthsCard(air) : ''}${industry ? sitesCard(industry) : ''}`;
  const period = sourceDate(report, 'cams');
  const year = industry?.source.reporting_year;
  const note = [
    air
      ? `Aer: modelul european Copernicus, corectat cu stațiile din oraș${period ? `, ${period}` : ''}.`
      : '',
    year ? `Industrie: registrul industrial european, raportările din ${String(year)}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return {
    html: chapter(
      `${head}${cards ? `<div class="aiA">${cards}</div>` : ''}${note ? footnote(note) : ''}<div class="sfB-rest ai-rest">${scoreCard('air', report, { label: 'Aer' })}${scoreCard('industry', report, { label: 'Industrie' })}${chapterSources(report, ['air', 'industry'])}</div>`,
    ),
    maps: [],
  };
};
