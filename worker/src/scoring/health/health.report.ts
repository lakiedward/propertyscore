import { z } from 'zod';

import type { JsonObject, Sql } from '../../db/sql.ts';
import { readCellCategory, sectionParams } from '../../report/cell-category.ts';
import type { ReportSection } from '../../report/report-section.ts';
import { healthParamsSchema } from './health.params.ts';

const HEALTH_LAYERS = ['h1', 'h2', 'h3', 'h4', 'h5'] as const;

const layerSchema = z.object({
  value: z.number(),
  t_min: z.number().nullable(),
  n: z.number().nullable(),
  mode: z.string().nullable(),
  poi_id: z.string().nullable(),
});

const inputsSchema = z.object({
  distance_method: z.string(),
  car_distance_method: z.string(),
  missing: z.array(z.string()),
  h1: layerSchema.optional(),
  h2: layerSchema.optional(),
  h3: layerSchema.optional(),
  h4: layerSchema.optional(),
  h5: layerSchema.optional(),
});

const placeSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  category: z.string(),
  longitude: z.number(),
  latitude: z.number(),
});

async function readPlaces(
  sql: Sql,
  ids: readonly string[],
): Promise<Map<string, z.infer<typeof placeSchema>>> {
  if (ids.length === 0) return new Map();
  const rows = await sql`
    select
      p.id::text as id,
      p.name,
      p.category,
      extensions.st_x(p.location::extensions.geometry) as longitude,
      extensions.st_y(p.location::extensions.geometry) as latitude
    from private.poi_features p
    where p.id = any(${ids}::uuid[])
  `;
  return new Map(
    z
      .array(placeSchema)
      .parse(rows)
      .map((row) => [row.id, row]),
  );
}

export const healthReportSection: ReportSection = {
  key: 'health',
  build: async ({ sql, snapshotId, cellId, params }) => {
    const healthParams = healthParamsSchema.parse(sectionParams(params, 'health'));
    const cell = await readCellCategory(sql, snapshotId, cellId, 'health');
    if (!cell) return null;
    const inputs = inputsSchema.safeParse(cell.inputs);
    if (cell.score === null || !inputs.success) {
      return { schema_version: 1, status: 'no_data' };
    }
    const layerIds = HEALTH_LAYERS.flatMap((key) => {
      const poiId = inputs.data[key]?.poi_id;
      return poiId ? [poiId] : [];
    });
    const places = await readPlaces(sql, [...new Set(layerIds)]);
    const section: JsonObject = {
      schema_version: 1,
      status: 'scored',
      distance_method: inputs.data.distance_method,
      car_distance_method: inputs.data.car_distance_method,
      missing: inputs.data.missing,
      layers: HEALTH_LAYERS.map((key) => {
        const layer = inputs.data[key];
        const place = layer?.poi_id ? places.get(layer.poi_id) : undefined;
        return {
          key,
          points: layer?.value ?? null,
          minutes: layer?.t_min ?? null,
          count: layer?.n ?? null,
          mode: layer?.mode ?? null,
          weight: healthParams.layers[key].weight,
          place: place
            ? {
                id: place.id,
                name: place.name,
                location: [Number(place.longitude.toFixed(6)), Number(place.latitude.toFixed(6))],
              }
            : null,
        };
      }),
    };
    return section;
  },
};
