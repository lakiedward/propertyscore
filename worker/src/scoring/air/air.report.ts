import { z } from 'zod';

import type { JsonObject, Sql } from '../../db/sql.ts';
import { readCellCategory, sectionParams } from '../../report/cell-category.ts';
import type { ReportSection } from '../../report/report-section.ts';
import { airParamsSchema, type AirParams } from './air.params.ts';

const monthlySchema = z.array(z.number().nullable());

const airRowSchema = z.object({
  period_start: z.string(),
  pm25_monthly: monthlySchema,
  no2_monthly: monthlySchema,
  pm25_annual: z.number().nullable(),
  no2_annual: z.number().nullable(),
  pm25_months_over_eu2030: z.number().nullable(),
  no2_months_over_eu2030: z.number().nullable(),
  spatial_method: z.enum(['eea_1km', 'cams_10km']),
  sub_scores: z.record(z.string(), z.number()),
  verdict_code: z.string().nullable(),
  watch_item: z.boolean(),
  city_pm25_annual: z.number().nullable(),
  city_no2_annual: z.number().nullable(),
});

type AirRow = z.infer<typeof airRowSchema>;

const cellInputsSchema = z.object({
  status: z.enum(['ok', 'partial', 'no_data']),
  calibrated: z.object({ pm25: z.boolean(), no2: z.boolean() }),
});

type CellInputs = z.infer<typeof cellInputsSchema>;

export function monthsFrom(periodStart: string, count: number): string[] {
  const [year, month] = periodStart.split('-').map(Number);
  if (year === undefined || month === undefined) return [];
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + index, 1));
    return `${String(date.getUTCFullYear())}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

function rounded(series: readonly (number | null)[]): (number | null)[] {
  return series.map((value) => (value === null ? null : Math.round(value * 10) / 10));
}

export function airSection(input: {
  score: number | null;
  inputs: CellInputs;
  row: AirRow;
  params: AirParams;
}): JsonObject {
  const { score, inputs, row, params } = input;
  return {
    schema_version: 1,
    status: score === null ? 'no_data' : 'scored',
    data_status: inputs.status,
    calibrated: inputs.calibrated,
    spatial_method: row.spatial_method,
    months: monthsFrom(row.period_start, row.pm25_monthly.length),
    pm25_monthly: rounded(row.pm25_monthly),
    no2_monthly: rounded(row.no2_monthly),
    pm25_annual: row.pm25_annual,
    no2_annual: row.no2_annual,
    months_over_limit: { pm25: row.pm25_months_over_eu2030, no2: row.no2_months_over_eu2030 },
    limits: params.eu2030_limits,
    weights: params.weights,
    sub_scores: row.sub_scores,
    verdict_code: row.verdict_code,
    watch_item: row.watch_item,
    city_avg: { pm25: row.city_pm25_annual, no2: row.city_no2_annual },
  };
}

async function readAirRow(
  sql: Sql,
  snapshotId: string,
  cellId: string,
  cityId: string,
): Promise<unknown> {
  const [row] = await sql<Record<string, unknown>[]>`
    select
      to_char(a.period_start, 'YYYY-MM-DD') as period_start,
      a.pm25_monthly::float8[] as pm25_monthly,
      a.no2_monthly::float8[] as no2_monthly,
      a.pm25_annual::float8 as pm25_annual,
      a.no2_annual::float8 as no2_annual,
      a.pm25_months_over_eu2030::int as pm25_months_over_eu2030,
      a.no2_months_over_eu2030::int as no2_months_over_eu2030,
      a.spatial_method,
      a.sub_scores,
      a.verdict_code,
      a.watch_item,
      city.pm25 as city_pm25_annual,
      city.no2 as city_no2_annual
    from private.cell_air a
    cross join lateral (
      select
        round(avg(c.pm25_annual), 2)::float8 as pm25,
        round(avg(c.no2_annual), 2)::float8 as no2
      from private.cell_air c
      join private.grid_cells g on g.id = c.cell_id
      join private.cell_scores cs on cs.snapshot_id = c.snapshot_id and cs.cell_id = c.cell_id
      where c.snapshot_id = ${snapshotId}
        and g.city_id = ${cityId}
        and cs.is_residential is not false
    ) as city
    where a.snapshot_id = ${snapshotId} and a.cell_id = ${cellId}
  `;
  return row;
}

export const airReportSection: ReportSection = {
  key: 'air',
  build: async ({ sql, snapshotId, cellId, params }) => {
    const airParams = airParamsSchema.parse(sectionParams(params, 'air'));
    const cell = await readCellCategory(sql, snapshotId, cellId, 'air');
    if (!cell) return null;
    const inputs = cellInputsSchema.safeParse(cell.inputs);
    const row = airRowSchema.safeParse(await readAirRow(sql, snapshotId, cellId, cell.cityId));
    if (!inputs.success || !row.success) {
      return { schema_version: 1, status: 'no_data', reason: 'no_source_data' };
    }
    return airSection({ score: cell.score, inputs: inputs.data, row: row.data, params: airParams });
  },
};
