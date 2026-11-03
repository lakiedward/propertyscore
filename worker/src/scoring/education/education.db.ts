import { z } from 'zod';

import type { JsonObject, Sql } from '../../db/sql.ts';
import type { InstitutionRow } from './education.match.ts';

const candidateSchema = z.object({
  cell_id: z.string(),
  cell_lng: z.number(),
  cell_lat: z.number(),
  poi_id: z.string(),
  poi_lng: z.number(),
  poi_lat: z.number(),
  institution_id: z.string(),
  entity: z.string(),
  straight_m: z.number(),
});

export type EducationCandidate = z.infer<typeof candidateSchema>;

const BATCH_SIZE = 500;

export async function upsertInstitutions(
  sql: Sql,
  cityId: string,
  seenOn: string,
  rows: readonly InstitutionRow[],
): Promise<number> {
  let written = 0;
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const [result] = await sql<{ written: number }[]>`
      select private.upsert_education_institutions(
        ${cityId},
        ${seenOn}::date,
        ${sql.json(batch)}::jsonb
      ) as written
    `;
    written += result?.written ?? 0;
  }
  return written;
}

export async function copyEducationPois(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  seenOn: string,
): Promise<number> {
  const [result] = await sql<{ copied: number }[]>`
    select private.copy_education_pois(${snapshotId}, ${cityId}, ${seenOn}::date) as copied
  `;
  return result?.copied ?? 0;
}

export async function listCandidates(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  category: string,
  radiusM: number,
  limit: number,
): Promise<EducationCandidate[]> {
  const rows = await sql`
    select cell_id, cell_lng, cell_lat, poi_id, poi_lng, poi_lat, institution_id, entity, straight_m
    from private.education_candidates(${snapshotId}, ${cityId}, ${category}, ${radiusM}, ${limit})
  `;
  return z.array(candidateSchema).parse(rows);
}

export async function listCityCells(
  sql: Sql,
  snapshotId: string,
  cityId: string,
): Promise<string[]> {
  const rows = await sql<{ cell_id: string }[]>`
    select cs.cell_id
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    where cs.snapshot_id = ${snapshotId} and g.city_id = ${cityId}
  `;
  return rows.map((row) => row.cell_id);
}

export async function writeEducationStats(
  sql: Sql,
  snapshotId: string,
  stats: Record<string, JsonObject>,
): Promise<void> {
  await sql`
    update public.score_snapshots
    set stats = stats || jsonb_build_object('education', ${sql.json(stats)}::jsonb)
    where id = ${snapshotId}
  `;
}
