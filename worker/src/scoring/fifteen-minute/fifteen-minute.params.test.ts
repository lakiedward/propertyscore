import { describe, expect, it } from 'vitest';

import { migrationParams } from './fifteen-minute.fixtures.ts';
import {
  fifteenMinuteParamsSchema,
  poiCategoriesFor,
  poiCategoryOf,
} from './fifteen-minute.params.ts';

describe('fifteenMinuteParamsSchema', () => {
  it('accepts the v1 parameters from the migration: 30 categories in 9 groups', () => {
    const params = fifteenMinuteParamsSchema.parse(migrationParams());
    expect(params.categories).toHaveLength(30);
    expect(new Set(params.categories.map((category) => category.group)).size).toBe(9);
    expect(params.walk_speed_kmh).toBe(4.5);
  });

  it('rejects a category without a source and duplicate keys', () => {
    const params = fifteenMinuteParamsSchema.parse(migrationParams());
    const [first] = params.categories;
    expect(
      fifteenMinuteParamsSchema.safeParse({
        ...params,
        categories: [{ ...first, osm: [], poi_categories: [] }],
      }).success,
    ).toBe(false);
    expect(
      fifteenMinuteParamsSchema.safeParse({ ...params, categories: [first, first] }).success,
    ).toBe(false);
  });
});

describe('poiCategoriesFor', () => {
  it('reads the own OSM category plus the categories of other scores', () => {
    const base = { key: 'school', group: 'schools', exclude: [], weight: 4, enough: 1 };
    expect(poiCategoryOf('school')).toBe('fifteen_minute_school');
    expect(
      poiCategoriesFor({ ...base, osm: ['amenity=school'], poi_categories: ['education_school'] }),
    ).toEqual(['fifteen_minute_school', 'education_school']);
    expect(poiCategoriesFor({ ...base, osm: [], poi_categories: ['education_school'] })).toEqual([
      'education_school',
    ]);
  });
});
