import { z } from 'zod';

const osmFilter = z.string().regex(/^[a-z_:]+=[^=,]+(,[^=,]+)*$/);

const categorySchema = z
  .object({
    key: z.string().regex(/^[a-z0-9_]+$/),
    group: z.string().regex(/^[a-z0-9_]+$/),
    osm: z.array(osmFilter).default([]),
    poi_categories: z.array(z.string().regex(/^[a-z0-9_]+$/)).default([]),
    exclude: z.array(osmFilter).default([]),
    name_pattern: z.string().min(1).optional(),
    weight: z.number().min(0),
    enough: z.number().int().min(1),
  })
  .refine((category) => category.osm.length > 0 || category.poi_categories.length > 0, {
    message: 'A category needs OSM filters or POI categories',
  });

export const fifteenMinuteParamsSchema = z.object({
  walk_speed_kmh: z.number().min(2).max(8),
  search_radius_m: z.number().int().min(300).max(5000),
  max_candidates: z.number().int().min(1).max(50),
  nearest_weight: z.number().min(0).max(1),
  choice_weight: z.number().min(0).max(1),
  proximity: z.object({
    full_min: z.number().min(0),
    limit_min: z.number().positive(),
    value_at_limit: z.number().min(0).max(1),
  }),
  smoothing: z.object({
    cell_weight: z.number().min(0),
    neighbour_weight: z.number().min(0),
  }),
  min_city_coverage: z.number().int().min(0),
  walk_detour_factor: z.number().min(1).max(2),
  report: z.object({
    isochrone_minutes: z.array(z.number().int().min(1).max(60)).min(1).max(4),
    candidates_per_category: z.number().int().min(1).max(100),
    places_per_category: z.number().int().min(1).max(50),
    routes: z.number().int().min(0).max(50),
  }),
  categories: z
    .array(categorySchema)
    .min(1)
    .refine((list) => new Set(list.map((category) => category.key)).size === list.length, {
      message: 'Category keys must be unique',
    }),
});

export type FifteenMinuteParams = z.infer<typeof fifteenMinuteParamsSchema>;

export type FifteenMinuteCategory = FifteenMinuteParams['categories'][number];

export const POI_CATEGORY_PREFIX = 'fifteen_minute_';

export function poiCategoryOf(key: string): string {
  return `${POI_CATEGORY_PREFIX}${key}`;
}

export function poiCategoriesFor(category: FifteenMinuteCategory): string[] {
  return category.osm.length > 0
    ? [poiCategoryOf(category.key), ...category.poi_categories]
    : [...category.poi_categories];
}
