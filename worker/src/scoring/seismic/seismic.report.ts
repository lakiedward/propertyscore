import type { JsonObject } from '../../db/sql.ts';
import { sectionParams } from '../../report/cell-category.ts';
import type { ReportSection } from '../../report/report-section.ts';
import { cityHazards, hazardAt, type AddressHazard, type CityHazard } from './seismic.db.ts';
import { hazardLevel, roundAcceleration } from './seismic.formula.ts';
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
  source: SeismicParams['source'];
};

export function seismicReportFromHazards(input: {
  citySlug: string;
  address: AddressHazard | null;
  cities: readonly CityHazard[];
  params: SeismicParams;
}): SeismicReport {
  const { params } = input;
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
    question_codes: params.question_codes,
    source: params.source,
  };
}

export const seismicReportSection: ReportSection = {
  key: 'seismic',
  build: async ({ sql, citySlug, latitude, longitude, params }) => {
    const raw = sectionParams(params, 'seismic');
    if (raw === undefined) return null;
    const seismic = parseSeismicParams(raw);
    const [address, cities] = await Promise.all([
      hazardAt(sql, { longitude, latitude, code: seismic.code, snapM: seismic.snap_m }),
      cityHazards(sql, seismic.code),
    ]);
    const section: JsonObject = seismicReportFromHazards({
      citySlug,
      address,
      cities,
      params: seismic,
    });
    return section;
  },
};
