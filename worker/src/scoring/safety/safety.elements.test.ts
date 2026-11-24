import { describe, expect, it } from 'vitest';

import { elementsEnvelope, elementsJson } from './safety.elements.ts';
import { v1Params } from './safety.test-params.ts';

const params = v1Params();

describe('elementsJson', () => {
  it('groups the elements by type into points, lines and areas', () => {
    const elements = elementsJson(
      [
        { feature_type: 'shop', geometry: '{"type":"Point","coordinates":[21.22571,45.75372]}' },
        { feature_type: 'shop', geometry: '{"type":"Point","coordinates":[21.226,45.754]}' },
        { feature_type: 'lighting', geometry: '{"type":"Point","coordinates":[21.2251,45.7531]}' },
        {
          feature_type: 'lighting',
          geometry:
            '{"type":"MultiLineString","coordinates":[[[21.2,45.7],[21.21,45.71]],[[21.22,45.72],[21.23,45.73]]]}',
        },
        {
          feature_type: 'park',
          geometry:
            '{"type":"Polygon","coordinates":[[[21.2,45.7],[21.21,45.7],[21.21,45.71],[21.2,45.7]]]}',
        },
      ],
      params,
    );

    expect(elements).toMatchObject({
      points: {
        shop: [
          [21.22571, 45.75372],
          [21.226, 45.754],
        ],
        lighting: [[21.2251, 45.7531]],
      },
      lines: {
        lighting: [
          [
            [21.2, 45.7],
            [21.21, 45.71],
          ],
          [
            [21.22, 45.72],
            [21.23, 45.73],
          ],
        ],
      },
      areas: {
        park: [
          [
            [
              [21.2, 45.7],
              [21.21, 45.7],
              [21.21, 45.71],
              [21.2, 45.7],
            ],
          ],
        ],
      },
    });
  });

  it('gives the radius each type counts within and leaves out mixed-use buildings', () => {
    const elements = elementsJson([], params);

    expect(elements.reach_m).toMatchObject({ shop: 120, police: 600, lighting: 45 });
    expect(elements.reach_m).not.toHaveProperty('mixed_use');
  });

  it('drops unreadable and degenerate geometries', () => {
    const elements = elementsJson(
      [
        { feature_type: 'shop', geometry: 'not json' },
        {
          feature_type: 'isolated_passage',
          geometry: '{"type":"LineString","coordinates":[[21.2,45.7]]}',
        },
        { feature_type: 'park', geometry: '{"type":"GeometryCollection","geometries":[]}' },
      ],
      params,
    );

    expect(elements).toMatchObject({ points: {}, lines: {}, areas: {} });
  });
});

describe('elementsEnvelope', () => {
  it('frames 6 km by 5 km around the address', () => {
    const frame = elementsEnvelope({ longitude: 21.18, latitude: 45.73 });

    expect(frame.north - frame.south).toBeCloseTo(5000 / 111_320, 6);
    expect((frame.east - frame.west) * 111_320 * Math.cos((45.73 * Math.PI) / 180)).toBeCloseTo(
      6000,
      0,
    );
  });
});
