import type { JsonObject } from '../../db/sql.ts';
import type { OsmFeature } from '../../sources/osm.ts';
import { type FifteenMinuteCategory, poiCategoryOf } from './fifteen-minute.params.ts';

type JsonValue = JsonObject[string];

export type PoiRow = {
  source_ref: string;
  category: string;
  name: string | null;
  geometry: { type: string; coordinates: JsonValue };
  tags: Record<string, string>;
  opening_hours: string | null;
  is_24h: boolean | null;
};

type TagFilter = { key: string; values: ReadonlySet<string> };

export type CategoryMatcher = {
  poiCategory: string;
  include: readonly TagFilter[];
  exclude: readonly TagFilter[];
  namePattern: RegExp | null;
};

const KEPT_TAGS = ['amenity', 'shop', 'leisure', 'healthcare', 'office', 'brand', 'operator'];

function parseFilter(filter: string): TagFilter {
  const [key = '', values = ''] = filter.split('=');
  return { key, values: new Set(values.split(',')) };
}

export function osmiumFilters(categories: readonly FifteenMinuteCategory[]): string[] {
  const filters = new Set<string>();
  for (const category of categories) {
    for (const filter of category.osm) filters.add(`nwr/${filter}`);
  }
  return [...filters].sort();
}

export function buildMatchers(categories: readonly FifteenMinuteCategory[]): CategoryMatcher[] {
  return categories
    .filter((category) => category.osm.length > 0)
    .map((category) => ({
      poiCategory: poiCategoryOf(category.key),
      include: category.osm.map(parseFilter),
      exclude: category.exclude.map(parseFilter),
      namePattern: category.name_pattern ? new RegExp(category.name_pattern, 'iu') : null,
    }));
}

function matchesAny(filters: readonly TagFilter[], tags: Record<string, string>): boolean {
  return filters.some((filter) => {
    const value = tags[filter.key];
    return value !== undefined && filter.values.has(value);
  });
}

export function matchCategories(
  matchers: readonly CategoryMatcher[],
  tags: Record<string, string>,
): string[] {
  return matchers
    .filter(
      (matcher) =>
        matchesAny(matcher.include, tags) &&
        !matchesAny(matcher.exclude, tags) &&
        (matcher.namePattern === null || matcher.namePattern.test(tags.name ?? '')),
    )
    .map((matcher) => matcher.poiCategory);
}

function bounded(value: string | undefined, max: number): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? null : trimmed;
}

export function poiRowsFromFeature(
  feature: OsmFeature,
  sourceRef: string,
  matchers: readonly CategoryMatcher[],
): PoiRow[] {
  const categories = matchCategories(matchers, feature.properties);
  if (categories.length === 0) return [];
  const openingHours = bounded(feature.properties.opening_hours, 500);
  const tags: Record<string, string> = {};
  for (const key of KEPT_TAGS) {
    const value = feature.properties[key];
    if (value !== undefined) tags[key] = value;
  }
  return categories.map((category) => ({
    source_ref: sourceRef,
    category,
    name: bounded(feature.properties.name, 300),
    geometry: {
      type: feature.geometry.type,
      coordinates: feature.geometry.coordinates as JsonValue,
    },
    tags,
    opening_hours: openingHours,
    is_24h: openingHours === null ? null : openingHours === '24/7',
  }));
}
