import { describe, expect, it } from 'vitest';

import { buildReach, decodeTravelRow } from './accessibility.reach.ts';

const ORIGIN = { lng: 21.225, lat: 45.75 };
const CELL_M = 175;
const METRES_PER_DEGREE = 111_195;

function cellAt(east: number, north: number, minutes: number | null) {
  return {
    lng:
      ORIGIN.lng + (east * CELL_M) / (METRES_PER_DEGREE * Math.cos((ORIGIN.lat * Math.PI) / 180)),
    lat: ORIGIN.lat + (north * CELL_M) / METRES_PER_DEGREE,
    minutes,
  };
}

function city() {
  const cells = [];
  for (let east = -10; east <= 10; east += 1) {
    for (let north = -10; north <= 10; north += 1) {
      const distance = Math.hypot(east, north);
      cells.push(cellAt(east, north, distance > 9.5 ? null : Math.round(distance * 5)));
    }
  }
  return cells;
}

describe('decodeTravelRow', () => {
  it('reads big-endian minutes and marks unreachable cells', () => {
    const row = Buffer.from([0, 12, 255, 255, 1, 0]);
    expect(decodeTravelRow(row, 3)).toEqual([12, null, 256]);
    expect(decodeTravelRow(row, 2)).toBeNull();
  });
});

describe('buildReach', () => {
  it('measures the share of the city and the neighbourhoods within each time', () => {
    const cells = city();
    const reach = buildReach({
      origin: ORIGIN,
      cells,
      cellSizeM: CELL_M,
      places: [
        { name: 'Cetate', place: 'suburb', ...cellAt(1, 1, null) },
        { name: 'Fabric', place: 'suburb', ...cellAt(7, 0, null) },
        { name: 'fabric', place: 'neighbourhood', ...cellAt(-7, 0, null) },
        { name: 'Departe', place: 'suburb', ...cellAt(40, 40, null) },
      ],
    });

    const within = (minutes: number) =>
      Math.round(
        (cells.filter((cell) => cell.minutes !== null && cell.minutes <= minutes).length /
          cells.length) *
          100,
      );
    expect(reach).toMatchObject({
      minutes: 30,
      share_pct: within(30),
      neighbourhoods_total: 2,
      neighbourhoods_reached: 1,
      shares: [
        { minutes: 15, share_pct: within(15), neighbourhoods_reached: 1 },
        { minutes: 30, share_pct: within(30), neighbourhoods_reached: 1 },
        { minutes: 45, share_pct: within(45), neighbourhoods_reached: 2 },
      ],
      neighbourhoods: [
        { name: 'Cetate', minutes: 7 },
        { name: 'Fabric', minutes: 35 },
      ],
    });
  });

  it('draws a smooth area for each time that grows with the minutes', () => {
    const reach = buildReach({ origin: ORIGIN, cells: city(), cellSizeM: CELL_M, places: [] });
    const isochrones = (reach?.isochrones ?? []) as {
      minutes: number;
      geometry: { type: string; coordinates: [number, number][][][] };
    }[];

    expect(isochrones.map((band) => band.minutes)).toEqual([15, 30, 45]);
    const extent = isochrones.map((band) => {
      const longitudes = band.geometry.coordinates.flat(2).map((point) => point[0]);
      return Math.max(...longitudes) - Math.min(...longitudes);
    });
    expect(isochrones.every((band) => band.geometry.type === 'MultiPolygon')).toBe(true);
    expect(extent[0]).toBeLessThan(extent[1] ?? 0);
    expect(extent[1]).toBeLessThan(extent[2] ?? 0);
    for (const band of isochrones) {
      for (const ring of band.geometry.coordinates.flat()) expect(ring[0]).toEqual(ring.at(-1));
    }
  });

  it('gives no reach when no cell can be reached', () => {
    expect(
      buildReach({
        origin: ORIGIN,
        cells: [cellAt(0, 0, null)],
        cellSizeM: CELL_M,
        places: [],
      }),
    ).toBeNull();
  });
});
