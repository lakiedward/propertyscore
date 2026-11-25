import { z } from 'zod';
import { isochroneSchema, positionSchema } from './shared.schemas';

const destinationSchema = z.object({
  id: z.string(),
  kind: z.string(),
  label: z.object({ ro: z.string(), en: z.string() }),
  group: z.string().nullable().default(null),
  location: positionSchema,
  minutes: z.number().nullable(),
  by_walking: z.boolean(),
  walk: z.number().nullable(),
  wait: z.number().nullable(),
  ride: z.number().nullable(),
  transfers: z.number().nullable(),
  route: z
    .object({
      ref: z.string().nullable(),
      mode: z.string(),
      colour: z.string().nullable().optional(),
    })
    .nullable(),
  path: z
    .array(z.object({ mode: z.enum(['walk', 'transit']), coordinates: z.array(positionSchema) }))
    .default([]),
});

export const accessibilitySectionSchema = z.object({
  status: z.literal('scored'),
  data_quality: z.enum(['gtfs', 'osm_only']),
  reference_date: z.iso.date().nullable().catch(null),
  stops: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      location: positionSchema,
      walk_min: z.number(),
      walk_m: z.number().nullable().default(null),
      routes: z.array(z.string()),
    }),
  ),
  routes: z.array(
    z.object({
      key: z.string(),
      ref: z.string().nullable(),
      mode: z.string(),
      colour: z.string().nullable().default(null),
      text_colour: z.string().nullable().default(null),
      peak_per_hour: z.number().nullable(),
    }),
  ),
  destinations: z.array(destinationSchema),
  destination_groups: z
    .object({
      high_schools: z.array(destinationSchema).default([]),
      faculties: z.array(destinationSchema).default([]),
    })
    .default({ high_schools: [], faculties: [] }),
  reach: z
    .object({
      minutes: z.number(),
      share_pct: z.number(),
      shares: z
        .array(
          z.object({
            minutes: z.number(),
            share_pct: z.number(),
            neighbourhoods_reached: z.number(),
          }),
        )
        .default([]),
      neighbourhoods_reached: z.number(),
      neighbourhoods_total: z.number(),
      isochrones: z.array(isochroneSchema),
      neighbourhoods: z.array(
        z.object({
          name: z.string(),
          place: z.string().optional(),
          location: positionSchema,
          minutes: z.number().nullable(),
        }),
      ),
    })
    .nullable()
    .default(null),
});
