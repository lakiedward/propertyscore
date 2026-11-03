import type { Sql } from '../../db/sql.ts';
import { importedReportingYear, listSitesNear, type NearbySite } from './industry.db.ts';
import { pointsLostPerSite, type IndustryParams } from './industry.formula.ts';
import { parseIndustryParams, siteContribution } from './industry.module.ts';

type IndustryReportSite = {
  id: string;
  name: string;
  sector_code: string;
  impact_codes: string[];
  distance_m: number;
  bearing_deg: number | null;
  location: [number, number];
  points_lost: number;
  reporting_year: number;
};

export type IndustryReport = {
  score: number | null;
  reason?: string;
  nearest_m: number | null;
  count_near: number;
  count_radius: number;
  near_m: number;
  radius_m: number;
  sites: IndustryReportSite[];
  source: { dataset: 'eea_ied_eprtr'; version: string; reporting_year: number | null };
};

export function industryReportFromSites(input: {
  sites: readonly NearbySite[];
  cellScore: number | null;
  params: IndustryParams;
  reportingYear: number | null;
}): IndustryReport {
  const { params, cellScore } = input;
  const source = {
    dataset: 'eea_ied_eprtr' as const,
    version: params.dataset.version,
    reporting_year: input.reportingYear,
  };
  const base = { near_m: params.near_m, radius_m: params.radius_m, source };
  if (input.reportingYear === null || cellScore === null) {
    return {
      ...base,
      score: null,
      reason: 'no_source_data',
      nearest_m: null,
      count_near: 0,
      count_radius: 0,
      sites: [],
    };
  }
  const sorted = [...input.sites].sort(
    (a, b) => a.distance_m - b.distance_m || a.site_id.localeCompare(b.site_id),
  );
  const contributions = sorted.map((site) =>
    siteContribution({ ...site, id: site.site_id }, site.distance_m, params),
  );
  const lost = pointsLostPerSite(contributions, cellScore);
  return {
    ...base,
    score: cellScore,
    nearest_m: sorted[0] ? Math.round(sorted[0].distance_m) : null,
    count_near: sorted.filter((site) => site.distance_m <= params.near_m).length,
    count_radius: sorted.length,
    sites: sorted.map((site) => ({
      id: site.site_id,
      name: site.name,
      sector_code: site.sector_code,
      impact_codes: site.impact_codes,
      distance_m: Math.round(site.distance_m),
      bearing_deg: site.bearing_deg === null ? null : Math.round(site.bearing_deg),
      location: [Number(site.longitude.toFixed(6)), Number(site.latitude.toFixed(6))],
      points_lost: lost.get(site.site_id) ?? 0,
      reporting_year: site.reporting_year,
    })),
  };
}

export async function buildIndustryReport(
  sql: Sql,
  input: { longitude: number; latitude: number; cellScore: number | null; params: unknown },
): Promise<IndustryReport> {
  const params = parseIndustryParams(input.params);
  const reportingYear = await importedReportingYear(sql, params.dataset.version);
  const sites =
    reportingYear === null
      ? []
      : await listSitesNear(sql, {
          longitude: input.longitude,
          latitude: input.latitude,
          reportingYear,
          version: params.dataset.version,
          radiusM: params.radius_m,
        });
  return industryReportFromSites({ sites, cellScore: input.cellScore, params, reportingYear });
}
