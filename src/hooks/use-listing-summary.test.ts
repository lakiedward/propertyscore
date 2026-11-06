import { renderHook } from '@testing-library/react';
import roCommon from '@/i18n/locales/ro/common.json';
import { changeLocale } from '@/i18n/i18n';
import { useListingSummary } from './use-listing-summary';

const LISTING = {
  transaction: 'rent' as const,
  title: 'Garsonieră, Circumvalațiunii',
  city: 'Timișoara',
  price: 450,
  currency: 'EUR',
  area_m2: 32,
  rooms: 1,
  floor: 0,
  building_floors: 10,
  year_built: null,
  description: null,
};

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

    expect(result.current.eyebrow).toBe('De închiriat · Timișoara');
    expect(result.current.price).toMatch(/^450\s€ \/ lună$/u);
    expect(result.current.facts.map((fact) => fact.label)).toEqual([
      '1 cameră',
      '32 m²',
      roCommon.listingSummary.facts.groundFloor,
    ]);
    expect(result.current.moreLabel).toBe('+2 poze');
    expect(result.current.photos[0]?.alt).toBe('Fotografia 1 din 6: Garsonieră, Circumvalațiunii');
  });

  it('leaves out the hidden-photo label when every photo fits the mosaic', () => {
    const { result } = renderHook(() => useListingSummary(LISTING, PHOTOS.slice(0, 3)));

    expect(result.current.moreLabel).toBeUndefined();
  });
});
