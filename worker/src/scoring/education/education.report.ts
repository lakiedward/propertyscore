import { z } from 'zod';

import type { JsonObject, Sql } from '../../db/sql.ts';
import { readCellCategory, sectionParams } from '../../report/cell-category.ts';
import type { ReportSection } from '../../report/report-section.ts';
import { educationParamsSchema, SCORED_LEVELS } from './education.params.ts';

const levelInputSchema = z.object({
  t1: z.number().nullable(),
  t2: z.number().nullable(),
  s: z.number(),
});

const inputsSchema = z.object({
  levels: z.object({
    kindergarten: levelInputSchema,
    school: levelInputSchema,
    high_school: levelInputSchema,
  }),
  counts: z.record(z.string(), z.number()),
  nearest_ids: z.array(z.string()),
  distance_method: z.string(),
});

const institutionSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  levels: z.array(z.string()),
  ownership: z.string(),
  longitude: z.number(),
  latitude: z.number(),
  distance_m: z.number(),
});

async function readInstitutions(
  sql: Sql,
  snapshotId: string,
  ids: readonly string[],
  position: { longitude: number; latitude: number },
  source: 'register' | 'legacyCopy' | 'snapshot',
): Promise<z.infer<typeof institutionSchema>[]> {
  if (ids.length === 0) return [];
  const institutions =
    source === 'snapshot'
      ? sql`
          select distinct on (p.tags->>'institution_id')
            p.tags->>'institution_id' as id, p.name,
            array(select jsonb_array_elements_text(p.tags->'levels')) as levels,
            p.tags->>'ownership' as ownership, p.location
          from private.poi_features p
          where p.snapshot_id = ${snapshotId} and p.tags ? 'institution_id'
            and p.tags->>'institution_id' = any(${ids}::text[])
          order by p.tags->>'institution_id', p.category
        `
      : source === 'legacyCopy'
        ? sql`
            select i.institution_id::text as id, i.name, i.levels, i.ownership, i.location
            from private.legacy_report_institutions i
            where i.snapshot_id = ${snapshotId} and i.institution_id = any(${ids}::uuid[])
          `
        : sql`
            select i.id::text as id, i.name, i.levels::text[] as levels, i.ownership, i.location
            from private.education_institutions i
            where i.id = any(${ids}::uuid[]) and i.location is not null
          `;
  const rows = await sql`
    select
      i.id,
      i.name,
      i.levels,
      i.ownership,
      extensions.st_x(i.location::extensions.geometry) as longitude,
      extensions.st_y(i.location::extensions.geometry) as latitude,
      extensions.st_distance(
        i.location,
        extensions.st_point(${position.longitude}, ${position.latitude}, 4326)::extensions.geography
      )::float8 as distance_m
    from (${institutions}) i
    order by distance_m, id
  `;
  return z.array(institutionSchema).parse(rows);
}

export const educationReportSection: ReportSection = {
  key: 'education',
  build: async ({ sql, snapshotId, cellId, latitude, longitude, params }) => {
    const educationParams = educationParamsSchema.parse(sectionParams(params, 'education'));
    const cell = await readCellCategory(sql, snapshotId, cellId, 'education');
    if (!cell) return null;
    const inputs = inputsSchema.safeParse(cell.inputs);
    if (cell.score === null || !inputs.success) {
      return { schema_version: 1, status: 'no_data' };
    }
    const [source] = await sql<{ legacy_observed_at: Date | null }[]>`
      select legacy_observed_at from private.industry_snapshot_source where snapshot_id=${snapshotId}
    `;
    const observedAt = source?.legacy_observed_at?.toISOString();
    const institutions = await readInstitutions(
      sql,
      snapshotId,
      inputs.data.nearest_ids,
      {
        longitude,
        latitude,
      },
      !source ? 'register' : observedAt ? 'legacyCopy' : 'snapshot',
    );
    const section: JsonObject = {
      schema_version: 1,
      status: 'scored',
      distance_method: inputs.data.distance_method,
      institutions_distance_method: 'straight_line',
      ...(observedAt ? { legacy_observed_at: observedAt } : {}),
      levels: SCORED_LEVELS.map((level) => ({
        key: level,
        nearest_min: inputs.data.levels[level].t1,
        second_min: inputs.data.levels[level].t2,
        points: inputs.data.levels[level].s,
        weight: educationParams.levels[level].weight,
        full_min: educationParams.levels[level].full_min,
        zero_min: educationParams.levels[level].zero_min,
      })),
      counts: inputs.data.counts,
      institutions: institutions.map((institution) => ({
        id: institution.id,
        name: institution.name,
        levels: institution.levels,
        ownership: institution.ownership,
        location: [
          Number(institution.longitude.toFixed(6)),
          Number(institution.latitude.toFixed(6)),
        ],
        walk_m: Math.round(institution.distance_m * educationParams.walk_detour_factor),
      })),
    };
    return section;
  },
};
