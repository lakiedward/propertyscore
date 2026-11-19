import type { JsonObject } from '../../db/sql.ts';
import { errorCode } from '../../lib/errors.ts';
import type { Logger } from '../../lib/logger.ts';
import { sectionParams } from '../../report/cell-category.ts';
import { readDeclaredDetails } from '../../report/declared.ts';
import type { ReportSection } from '../../report/report-section.ts';
import type { EarthquakeCatalog } from './earthquake-catalog.ts';
import { buildEarthquakeReport, type EarthquakeReport } from './earthquakes.ts';
import { cityHazards, hazardAt, type AddressHazard, type CityHazard } from './seismic.db.ts';
import { buildingPeriod, hazardLevel, roundAcceleration } from './seismic.formula.ts';
import { parseSeismicParams, type HazardLevel, type SeismicParams } from './seismic.params.ts';

const OTHER_PRECISION = { address: 'city', city: 'address' } as const;

export type SeismicReport = {
  schema_version: 1;
  status: 'context' | 'no_data';
  reason?: string;
  code: string;
  return_period_years: number;
  exceedance: { probability: number; years: number };
  precision: SeismicParams['precision'];
  ag_g: number | null;
  level: HazardLevel | null;
  address_ag_g: number | null;
  city: { slug: string; ag_g: number; varies_within_city: boolean } | null;
  comparison: { slug: string; ag_g: number }[];
  question_codes: string[];
  building: {
    construction_year: number;
    period: string;
    codes: string[];
  } | null;
  earthquakes: EarthquakeReport | null;
  source: SeismicParams['source'];
};

export function seismicReportFromHazards(input: {
  citySlug: string;
  address: AddressHazard | null;
  cities: readonly CityHazard[];
  params: SeismicParams;
  constructionYear?: number | null;
  earthquakes?: EarthquakeReport | null;
}): SeismicReport {
  const { params } = input;
  const year = input.constructionYear ?? null;
  const periods = params.building_periods ?? [];
  const period = year === null ? undefined : buildingPeriod(year, periods);
  const building =
    year === null || period === undefined
      ? null
      : { construction_year: year, period: period.key, codes: period.codes };
  const questionCodes = [...new Set([...params.question_codes, ...(period?.question_codes ?? [])])];
  const cityRow = input.cities.find((city) => city.slug === input.citySlug);
  const city = cityRow
    ? {
        slug: cityRow.slug,
        ag_g: roundAcceleration(cityRow.ag_g),
        varies_within_city: cityRow.zone_count > 1,
      }
    : null;
  const addressAg = input.address ? roundAcceleration(input.address.ag_g) : null;
  const preferred = params.precision === 'address' ? addressAg : (city?.ag_g ?? null);
  const fallback = params.precision === 'address' ? (city?.ag_g ?? null) : addressAg;
  const agG = preferred ?? fallback;
  const usesFallback = preferred === null && fallback !== null;
  const precision = usesFallback ? OTHER_PRECISION[params.precision] : params.precision;

  return {
    schema_version: 1,
    status: agG === null ? 'no_data' : 'context',
    ...(agG === null ? { reason: 'outside_seismic_zones' } : {}),
    code: params.code,
    return_period_years: params.return_period_years,
    exceedance: params.exceedance,
    precision,
    ag_g: agG,
    level: agG === null ? null : hazardLevel(agG, params),
    address_ag_g: addressAg,
    city,
    comparison: input.cities.map((row) => ({ slug: row.slug, ag_g: roundAcceleration(row.ag_g) })),
    question_codes: questionCodes,
    building,
    earthquakes: input.earthquakes ?? null,
    source: params.source,
  };
}

export async function nearbyEarthquakes(input: {
  catalog: EarthquakeCatalog | null;
  longitude: number;
  latitude: number;
  logger: Logger;
  now?: Date;
}): Promise<EarthquakeReport | null> {
  if (input.catalog === null) return null;
  try {
    const { usgs, emsc } = await input.catalog.near(input);
    return buildEarthquakeReport({
      longitude: input.longitude,
      latitude: input.latitude,
      usgs,
      emsc,
      retrievedOn: (input.now ?? new Date()).toISOString().slice(0, 10),
    });
  } catch (error) {
    input.logger.warn('earthquake catalogue skipped', { code: errorCode(error) });
    return null;
  }
}

export const seismicReportSection: ReportSection = {
  key: 'seismic',
  build: async ({ sql, reportId, citySlug, latitude, longitude, params, logger, earthquakes }) => {
    const raw = sectionParams(params, 'seismic');
    if (raw === undefined) return null;
    const seismic = parseSeismicParams(raw);
    const [address, cities, declared, nearby] = await Promise.all([
      hazardAt(sql, { longitude, latitude, code: seismic.code, snapM: seismic.snap_m }),
      cityHazards(sql, seismic.code),
      readDeclaredDetails(sql, reportId),
      nearbyEarthquakes({ catalog: earthquakes ?? null, longitude, latitude, logger }),
    ]);
    const section: JsonObject = seismicReportFromHazards({
      citySlug,
      address,
      cities,
      params: seismic,
      constructionYear: declared.constructionYear,
      earthquakes: nearby,
    });
    return section;
  },
};
