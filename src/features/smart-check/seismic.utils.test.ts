import { describe, expect, it } from 'vitest';
import {
  markerLabels,
  scaleGroups,
  scalePosition,
  strongestEarthquakes,
  type SeismicEarthquakes,
} from './seismic.utils';
import type { ReportResult } from './report.types';

function earthquake(
  magnitude: number,
  distance: number,
  location: [number, number] = [21, 45.7],
): SeismicEarthquakes['events'][number] {
  return { date: '2000-01-01', magnitude, distance_km: distance, place: null, location };
}

const EARTHQUAKES: SeismicEarthquakes = {
  catalogue: 'USGS',
  since_year: 1936,
  radius_km: 60,
  min_magnitude: 3.5,
  retrieved_on: null,
  sources: [],
  events: [earthquake(4, 10), earthquake(5.6, 45), earthquake(5.6, 25), earthquake(3.6, 5)],
};

describe('strongestEarthquakes', () => {
  it('orders by magnitude, then by distance, and caps the list', () => {
    const top = strongestEarthquakes(EARTHQUAKES, 3);
    expect(top.map((event) => [event.magnitude, event.distance_km])).toEqual([
      [5.6, 25],
      [5.6, 45],
      [4, 10],
    ]);
  });
});

describe('markerLabels', () => {
  it('shares one label between earthquakes within 4 km', () => {
    const near = earthquake(5, 10, [21, 45.7]);
    const alsoNear = earthquake(4.9, 11, [21.01, 45.7]);
    const far = earthquake(4.8, 12, [22, 46]);
    const labels = markerLabels([near, alsoNear, far]);
    expect(labels.get(near)).toBe('1·2');
    expect(labels.get(alsoNear)).toBeNull();
    expect(labels.get(far)).toBe('3');
  });
});

describe('scale', () => {
  it('maps 0.05 g and 0.35 g to the ends of the track', () => {
    expect(scalePosition(0.05)).toBe(0);
    expect(scalePosition(0.35)).toBeCloseTo(100);
    expect(scalePosition(0.2)).toBeCloseTo(50);
  });

  it('groups cities by value, highest first, with the report city first in its group', () => {
    const seismic = {
      ag_g: 0.2,
      comparison: [
        { slug: 'bucuresti', ag_g: 0.3 },
        { slug: 'constanta', ag_g: 0.2 },
        { slug: 'timisoara', ag_g: 0.2 },
      ],
    } as NonNullable<ReportResult['sections']['seismic']>;
    const groups = scaleGroups(seismic, 'timisoara');
    expect(groups.map((group) => group.value)).toEqual([0.3, 0.2]);
    expect(groups[1]).toEqual({ value: 0.2, isHere: true, slugs: ['timisoara', 'constanta'] });
  });
});
