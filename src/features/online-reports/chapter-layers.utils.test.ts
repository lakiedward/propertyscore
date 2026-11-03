import { buildFifteenMinuteSection } from '@/test/factories/online-report';
import { extremeMonths } from './air-section.utils';
import { lineFeatures, noiseBandIndex } from './chapter-layers.utils';
import { nearestPerGroup, placesWithin } from './fifteen-minute-section.utils';
import { fifteenMinuteSectionSchema } from './online-report.schemas';

describe('noiseBandIndex', () => {
  it('places a contour in the band its lower level reaches', () => {
    expect(noiseBandIndex(40, [45, 55, 65, 70])).toBe(0);
    expect(noiseBandIndex(55, [45, 55, 65, 70])).toBe(2);
    expect(noiseBandIndex(75, [45, 55, 65, 70])).toBe(4);
  });
});

describe('lineFeatures', () => {
  it('splits a multi-line into lines and drops other geometries', () => {
    const lines = lineFeatures(
      {
        type: 'MultiLineString',
        coordinates: [
          [
            [21, 45],
            [21.1, 45.1],
          ],
          [
            [21.2, 45.2],
            [21.3, 45.3],
          ],
        ],
      },
      { kind: 'road' },
    );
    expect(lines).toHaveLength(2);
    expect(lineFeatures({ type: 'Point', coordinates: [21, 45] }, {})).toEqual([]);
  });
});

describe('extremeMonths', () => {
  it('finds the worst and cleanest months and skips the gaps', () => {
    expect(extremeMonths(['2025-11', '2025-12', '2026-01'], [12, null, 20])).toEqual({
      highest: { month: '2026-01', value: 20 },
      lowest: { month: '2025-11', value: 12 },
    });
  });
});

describe('fifteen-minute utils', () => {
  const section = fifteenMinuteSectionSchema.parse(buildFifteenMinuteSection());

  it('keeps the nearest place of each group', () => {
    expect(nearestPerGroup(section).map((place) => place.name)).toEqual(['Profi']);
  });

  it('adds up the places within 15 minutes', () => {
    expect(placesWithin(section)).toBe(6);
  });

  it('reads an unknown category as other instead of failing the report', () => {
    const parsed = fifteenMinuteSectionSchema.parse({
      ...buildFifteenMinuteSection(),
      places: [{ ...buildFifteenMinuteSection().places[0], category: 'ice_rink' }],
    });
    expect(parsed.places[0]?.category).toBe('other');
  });
});
