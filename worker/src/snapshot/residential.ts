import type { Sql } from '../db/sql.ts';
import {
  cityBoundingBox,
  extractOsmFeatures,
  osmSourceRef,
  readOsmFeatures,
} from '../sources/osm.ts';
import type { CoveredCity } from './snapshot.db.ts';

const BATCH_SIZE = 500;

type ResidentialRow = { source_ref: string; geojson: string };

async function saveResidentialAreas(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  rows: readonly ResidentialRow[],
): Promise<void> {
  if (rows.length === 0) return;
  await sql`
    insert into private.residential_areas (snapshot_id, city_id, source, source_ref, geometry)
    select
      ${snapshotId},
      ${cityId},
      'osm',
      row.source_ref,
      extensions.st_multi(
        extensions.st_collectionextract(
          extensions.st_makevalid(
            extensions.st_setsrid(extensions.st_geomfromgeojson(row.geojson), 4326)
          ),
          3
        )
      )::extensions.geography
    from jsonb_to_recordset(${sql.json([...rows])}::jsonb) as row (source_ref text, geojson text)
    on conflict (snapshot_id, source, source_ref) do update set geometry = excluded.geometry
  `;
}

export async function markResidentialCells(options: {
  sql: Sql;
  snapshotId: string;
  city: CoveredCity;
  extractPath: string;
  workDir: string;
  minShare: number;
}): Promise<number> {
  const { sql, snapshotId, city } = options;
  const exported = await extractOsmFeatures({
    extractPath: options.extractPath,
    bbox: await cityBoundingBox(sql, city.id),
    filters: ['wr/landuse=residential'],
    geometryTypes: ['polygon'],
    workDir: options.workDir,
    name: `${city.slug}-residential`,
  });

  let batch: ResidentialRow[] = [];
  for await (const feature of readOsmFeatures(exported)) {
    batch.push({ source_ref: osmSourceRef(feature.id), geojson: JSON.stringify(feature.geometry) });
    if (batch.length >= BATCH_SIZE) {
      await saveResidentialAreas(sql, snapshotId, city.id, batch);
      batch = [];
    }
  }
  await saveResidentialAreas(sql, snapshotId, city.id, batch);

  const [row] = await sql<{ marked: number }[]>`
    select private.mark_residential_cells(${snapshotId}, ${city.id}, ${options.minShare}) as marked
  `;
  return row?.marked ?? 0;
}
