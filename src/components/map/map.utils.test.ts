import type { LngLatBounds } from './map.config';
import { boundsOf, boundsOfPolygons, containsBounds, tilesInView } from './map.utils';

const ROMANIA: LngLatBounds = [
  [20.26, 43.62],
  [29.7, 48.27],
];

describe('map.utils', () => {
  describe('boundsOf', () => {
    it('returns nothing for no points', () => {
      expect(boundsOf([])).toBeUndefined();
    });

    it('spans every point', () => {
      expect(
        boundsOf([
          [21.22, 45.75],
          [21.24, 45.74],
          [21.21, 45.76],
        ]),
      ).toEqual([
        [21.21, 45.74],
        [21.24, 45.76],
      ]);
    });
  });

  describe('boundsOfPolygons', () => {
    it('spans the outer rings and ignores the holes', () => {
      expect(
        boundsOfPolygons([
          [
            [
              [21, 45],
              [22, 45],
              [22, 46],
              [21, 45],
            ],
            [
              [10, 10],
              [11, 11],
            ],
          ],
        ]),
      ).toEqual([
        [21, 45],
        [22, 46],
      ]);
    });
  });

  describe('containsBounds', () => {
    it('tells whether an area holds the whole of another one', () => {
      expect(
        containsBounds(
          [
            [19.94, 43.54],
            [30.02, 48.34],
          ],
          ROMANIA,
        ),
      ).toBe(true);
      expect(
        containsBounds(
          [
            [21.1, 45.7],
            [21.3, 45.8],
          ],
          ROMANIA,
        ),
      ).toBe(false);
    });
  });

  describe('tilesInView', () => {
    it('lists the tiles a desktop map of Romania asks for first', () => {
      expect(tilesInView(ROMANIA, { width: 1440, height: 823 }, 10, { min: 4, max: 16 })).toEqual([
        { z: 6, x: 35, y: 22 },
        { z: 6, x: 35, y: 23 },
        { z: 6, x: 36, y: 22 },
        { z: 6, x: 36, y: 23 },
        { z: 6, x: 37, y: 22 },
        { z: 6, x: 37, y: 23 },
      ]);
    });

    it('lists the tiles a phone map of Romania asks for first', () => {
      expect(tilesInView(ROMANIA, { width: 390, height: 767 }, 10, { min: 4, max: 16 })).toEqual([
        { z: 4, x: 8, y: 5 },
        { z: 4, x: 8, y: 6 },
        { z: 4, x: 9, y: 5 },
        { z: 4, x: 9, y: 6 },
      ]);
    });

    it('keeps the tile zoom inside the range the tiles exist for', () => {
      const tiles = tilesInView(ROMANIA, { width: 200, height: 200 }, 10, { min: 6, max: 16 });

      expect(tiles.every((tile) => tile.z === 6)).toBe(true);
    });

    it('never asks for a tile outside the world', () => {
      const tiles = tilesInView(
        [
          [-179.9, -80],
          [179.9, 80],
        ],
        { width: 4000, height: 4000 },
        0,
        { min: 0, max: 2 },
      );

      expect(
        tiles.every(
          (tile) => tile.x >= 0 && tile.y >= 0 && tile.x < 2 ** tile.z && tile.y < 2 ** tile.z,
        ),
      ).toBe(true);
    });
  });
});
