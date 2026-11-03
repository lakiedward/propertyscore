import { describe, expect, it } from 'vitest';

import { testParams } from './fifteen-minute.fixtures.ts';
import {
  buildMatchers,
  matchCategories,
  osmiumFilters,
  poiRowsFromFeature,
} from './fifteen-minute.pois.ts';

const params = testParams();
const matchers = buildMatchers(params.categories);

describe('osmiumFilters', () => {
  it('turns every OSM filter of the taxonomy into one osmium expression', () => {
    const filters = osmiumFilters(params.categories);
    expect(filters).toContain('nwr/shop=supermarket');
    expect(filters).toContain('nwr/amenity=restaurant,fast_food');
    expect(filters.filter((filter) => filter === 'nwr/amenity=school')).toHaveLength(1);
  });
});

describe('matchCategories', () => {
  it('matches every category whose tags fit', () => {
    expect(matchCategories(matchers, { amenity: 'fast_food' })).toEqual([
      'fifteen_minute_restaurant',
    ]);
    expect(matchCategories(matchers, { shop: 'florist' })).toEqual([]);
  });

  it('applies the name pattern for high schools', () => {
    expect(
      matchCategories(matchers, { amenity: 'school', name: 'Colegiul Național Bănățean' }),
    ).toEqual(['fifteen_minute_school', 'fifteen_minute_high_school']);
    expect(
      matchCategories(matchers, { amenity: 'school', name: 'Școala Gimnazială nr. 2' }),
    ).toEqual(['fifteen_minute_school']);
  });

  it('leaves out private swimming pools', () => {
    expect(matchCategories(matchers, { leisure: 'swimming_pool', access: 'private' })).toEqual([]);
    expect(matchCategories(matchers, { leisure: 'swimming_pool' })).toEqual([
      'fifteen_minute_swimming_pool',
    ]);
  });
});

describe('poiRowsFromFeature', () => {
  it('keeps the name, the opening hours and a few descriptive tags', () => {
    const rows = poiRowsFromFeature(
      {
        id: 'n42',
        geometry: { type: 'Point', coordinates: [21.23, 45.75] },
        properties: {
          amenity: 'pharmacy',
          name: 'Farmacia Catena',
          opening_hours: '24/7',
          brand: 'Catena',
          phone: '0256',
        },
      },
      'osm:node/42',
      matchers,
    );
    expect(rows).toEqual([
      {
        source_ref: 'osm:node/42',
        category: 'fifteen_minute_pharmacy',
        name: 'Farmacia Catena',
        geometry: { type: 'Point', coordinates: [21.23, 45.75] },
        tags: { amenity: 'pharmacy', brand: 'Catena' },
        opening_hours: '24/7',
        is_24h: true,
      },
    ]);
  });

  it('skips features no category wants and leaves unknown hours empty', () => {
    expect(
      poiRowsFromFeature(
        { id: 'n1', geometry: { type: 'Point', coordinates: [] }, properties: {} },
        'osm:node/1',
        matchers,
      ),
    ).toEqual([]);
    const [row] = poiRowsFromFeature(
      { id: 'n2', geometry: { type: 'Point', coordinates: [] }, properties: { shop: 'bakery' } },
      'osm:node/2',
      matchers,
    );
    expect(row).toMatchObject({ name: null, opening_hours: null, is_24h: null });
  });
});
