import { renderHook } from '@testing-library/react';
import roCommon from '@/i18n/locales/ro/common.json';
import { changeLocale } from '@/i18n/i18n';
import { buildMyListing } from '@/test/factories/my-listing';
import { useListingSummary } from './use-listing-summary';

const LISTING = buildMyListing({
  transaction: 'rent',
  title: 'Garsonieră, Circumvalațiunii',
  city: 'Timișoara',
  price: 450,
  area_m2: 32,
  rooms: 1,
  floor: 0,
  building_floors: 10,
  year_built: null,
  description: null,
  bathrooms: null,
});

const PHOTOS = Array.from({ length: 6 }, (_, index) => ({
  id: String(index),
  src: `${String(index)}.webp`,
  smallSrc: `${String(index)}-medium.webp`,
}));

describe('useListingSummary', () => {
  beforeEach(async () => {
    await changeLocale('ro');
  });

  it('describes the listing with its price, facts and photos', () => {
    const { result } = renderHook(() => useListingSummary(LISTING, PHOTOS));

    expect(result.current.eyebrow).toBe('Apartament de închiriat · Timișoara');
    expect(result.current.price).toMatch(/^450\s€ \/ lună$/u);
    expect(result.current.facts.map((fact) => fact.label)).toEqual([
      '1 cameră',
      '32 m²',
      roCommon.listingSummary.facts.groundFloor,
    ]);
    expect(result.current.moreLabel).toBe('+3 poze');
    expect(result.current.photos[0]?.alt).toBe('Fotografia 1 din 6: Garsonieră, Circumvalațiunii');
  });

  it('leaves out the hidden-photo label when every photo fits the mosaic', () => {
    const { result } = renderHook(() => useListingSummary(LISTING, PHOTOS.slice(0, 3)));

    expect(result.current.moreLabel).toBeUndefined();
  });

  it('lists the filled-in details of an apartment', () => {
    const { result } = renderHook(() => useListingSummary(LISTING, PHOTOS));

    expect(result.current.details).toEqual(
      expect.arrayContaining([
        { key: 'partitioning', label: 'Compartimentare', value: 'Semidecomandat' },
        { key: 'comfort', label: 'Confort', value: 'Confort 1' },
        { key: 'utilities', label: 'Utilități', value: 'Apă și Gaze' },
        { key: 'features', label: 'Dotări', value: 'Lift' },
      ]),
    );
    expect(result.current.details.map((detail) => detail.key)).not.toContain('pool');
  });

  it('describes a house by its land, bathrooms and floors above ground', () => {
    const house = buildMyListing({
      property_type: 'house',
      transaction: 'sale',
      floor: null,
      building_floors: 1,
      bathrooms: 2,
      land_area_m2: 420,
      house_type: 'detached',
      partitioning: null,
      comfort: null,
      building_type: null,
      has_elevator: false,
      has_attic: true,
    });
    const { result } = renderHook(() => useListingSummary(house, PHOTOS));

    expect(result.current.eyebrow).toBe('Casă de vânzare · Timișoara');
    expect(result.current.facts.map((fact) => fact.key)).toEqual(
      expect.arrayContaining(['bathrooms', 'land', 'levels']),
    );
    expect(result.current.facts.find((fact) => fact.key === 'land')?.label).toBe('Teren 420 m²');
    expect(result.current.details).toEqual(
      expect.arrayContaining([
        { key: 'houseType', label: 'Tip locuință', value: 'Individuală' },
        { key: 'levels', label: 'Locuința are', value: 'Mansardă' },
      ]),
    );
  });
});
