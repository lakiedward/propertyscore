import { join } from 'node:path';

import type { JsonObject } from '../../db/sql.ts';
import { errorCode, WorkerError } from '../../lib/errors.ts';
import { downloadOnce } from '../../sources/download.ts';
import type { ScoreModule } from '../score-module.ts';
import { writeCategoryScores, type CellCategoryScore } from '../write-category-scores.ts';
import {
  buildRegisterSites,
  EEA_FILES,
  INSTALLATION_COLUMNS,
  latestReportingYear,
  readCountryRows,
  readZipMember,
  RELEASE_COLUMNS,
} from './eea-register.ts';
import {
  importedReportingYear,
  listCellSitePairs,
  listCityCells,
  listStoredSites,
  storeRegisterSites,
  writeIndustryStats,
  type CellSitePair,
  type StoredSite,
} from './industry.db.ts';
import {
  distanceFactor,
  emissionClass,
  industryParamsSchema,
  industryPressure,
  industryScore,
  siteWeight,
  type IndustryParams,
  type SiteContribution,
} from './industry.formula.ts';

export function parseIndustryParams(value: unknown): IndustryParams {
  const parsed = industryParamsSchema.safeParse(value);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError('invalid_industry_params', `Invalid params.industry: ${fields}`);
  }
  return parsed.data;
}

export function siteContribution(
  site: Pick<StoredSite, 'id' | 'sector_code' | 'is_top_emitter' | 'has_air_releases'>,
  distanceM: number,
  params: IndustryParams,
): SiteContribution {
  return {
    siteId: site.id,
    distanceM,
    weight: siteWeight(
      site.sector_code,
      emissionClass(site.has_air_releases, site.is_top_emitter),
      params,
    ),
    factor: distanceFactor(distanceM, params.decay),
  };
}

const round = (value: number, digits: number) => Number(value.toFixed(digits));

export function scoreCells(input: {
  cellIds: readonly string[];
  pairs: readonly CellSitePair[];
  sites: ReadonlyMap<string, StoredSite>;
  params: IndustryParams;
  reportingYear: number;
}): CellCategoryScore[] {
  const byCell = new Map<string, SiteContribution[]>();
  for (const pair of input.pairs) {
    const site = input.sites.get(pair.site_id);
    if (!site) continue;
    const contributions = byCell.get(pair.cell_id) ?? [];
    contributions.push(siteContribution(site, pair.distance_m, input.params));
    byCell.set(pair.cell_id, contributions);
  }
  return input.cellIds.map((cellId) => {
    const contributions = (byCell.get(cellId) ?? []).filter((site) => site.factor > 0);
    const pressure = industryPressure(contributions);
    return {
      cellId,
      score: industryScore(pressure, input.params.k),
      inputs: {
        P: round(pressure, 4),
        reporting_year: input.reportingYear,
        sites: contributions.map((site) => ({
          id: site.siteId,
          d_m: Math.round(site.distanceM),
          w: round(site.weight, 3),
          f: round(site.factor, 4),
        })),
      },
    };
  });
}

async function ensureRegister(
  context: Parameters<ScoreModule['run']>[0],
  params: IndustryParams,
): Promise<number | null> {
  const { sql, logger } = context;
  const { version, url, country } = params.dataset;
  const imported = await importedReportingYear(sql, version);
  if (imported !== null) return imported;

  const zipPath = await downloadOnce(
    url,
    join(context.sourcesDir, 'eea', `industrial-${version}.zip`),
  );
  const installations = await readCountryRows(
    readZipMember(zipPath, EEA_FILES.installations),
    INSTALLATION_COLUMNS,
    'CountryName',
    country,
    EEA_FILES.installations,
  );
  const airReleases = await readCountryRows(
    readZipMember(zipPath, EEA_FILES.air),
    RELEASE_COLUMNS,
    'countryName',
    country,
    EEA_FILES.air,
  );
  const waterReleases = await readCountryRows(
    readZipMember(zipPath, EEA_FILES.water),
    RELEASE_COLUMNS,
    'countryName',
    country,
    EEA_FILES.water,
  );
  const reportingYear = latestReportingYear(installations, airReleases);
  if (reportingYear === null) return null;

  const sites = buildRegisterSites({
    installations,
    airReleases,
    waterReleases,
    reportingYear,
    params,
  });
  const summary = await storeRegisterSites(sql, {
    version,
    reportingYear,
    sites,
    radiusM: params.radius_m,
    suspectCenterM: params.suspect_center_m,
  });
  logger.info('industrial register imported', {
    version,
    reporting_year: reportingYear,
    ...summary,
  });
  return reportingYear;
}

export const industryModule: ScoreModule = {
  key: 'industry',
  async run(context) {
    const { sql, snapshotId, logger } = context;
    const params = parseIndustryParams(context.params);
    const { version } = params.dataset;

    let reportingYear: number | null;
    let reason = 'no_source_data';
    try {
      reportingYear = await ensureRegister(context, params);
    } catch (error) {
      reason = errorCode(error);
      if (reason === 'unknown' || reason === 'invalid_industry_params') throw error;
      logger.warn('industrial register unavailable', { code: reason });
      reportingYear = null;
    }

    const sites = reportingYear === null ? [] : await listStoredSites(sql, version, reportingYear);
    const siteMap = new Map(sites.map((site) => [site.id, site]));
    const stats: JsonObject = {};

    for (const city of context.cities) {
      const cellIds = await listCityCells(sql, snapshotId, city.id);
      const rows: CellCategoryScore[] =
        reportingYear === null
          ? cellIds.map((cellId) => ({ cellId, score: null, inputs: { reason } }))
          : scoreCells({
              cellIds,
              pairs: await listCellSitePairs(sql, {
                snapshotId,
                cityId: city.id,
                reportingYear,
                version,
                radiusM: params.radius_m,
              }),
              sites: siteMap,
              params,
              reportingYear,
            });
      const written = await writeCategoryScores(sql, snapshotId, 'industry', rows);
      const citySites = sites.filter((site) => site.city_id === city.id);
      stats[city.slug] = {
        sites_in_buffer: citySites.length,
        suspect: citySites.filter((site) => site.coordinate_status === 'suspect').length,
        corrected: citySites.filter((site) => site.coordinate_status === 'corrected').length,
      };
      logger.info('industry city scored', {
        city: city.slug,
        cells: written,
        sites: citySites.length,
      });
    }

    await writeIndustryStats(sql, snapshotId, stats);
    const sourceDates: Record<string, string> = {};
    if (reportingYear !== null) {
      sourceDates.eea_industrial = version;
      sourceDates.eea_industrial_year = String(reportingYear);
    }
    return { sourceDates };
  },
};
