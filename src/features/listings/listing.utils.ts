import type { TrustKind } from '@/components/trust/trust.utils';
import type { LngLatBounds } from '@/components/map/map.config';
import type { ListingBounds, ListingVerification } from './listing.types';

export function toTrustKind(verification: ListingVerification): TrustKind {
  if (verification === 'smartcheck') {
    return 'online';
  }
  return verification;
}

const BOUNDS_STEP = 10_000;

export function toListingBounds([[west, south], [east, north]]: LngLatBounds): ListingBounds {
  return {
    west: Math.floor(west * BOUNDS_STEP) / BOUNDS_STEP,
    south: Math.floor(south * BOUNDS_STEP) / BOUNDS_STEP,
    east: Math.ceil(east * BOUNDS_STEP) / BOUNDS_STEP,
    north: Math.ceil(north * BOUNDS_STEP) / BOUNDS_STEP,
  };
}

export function sameListingBounds(
  left: ListingBounds | undefined,
  right: ListingBounds | undefined,
): boolean {
  return (
    right !== undefined &&
    left?.west === right.west &&
    left.south === right.south &&
    left.east === right.east &&
    left.north === right.north
  );
}

export function moveId(ids: readonly string[], id: string, targetIndex: number): string[] {
  const rest = ids.filter((candidate) => candidate !== id);
  if (rest.length === ids.length) {
    return [...ids];
  }
  const index = Math.min(Math.max(targetIndex, 0), rest.length);
  return [...rest.slice(0, index), id, ...rest.slice(index)];
}

const EWKB_SRID_FLAG = 0x20000000;
const EWKB_POINT_TYPE = 1;

export function parseEwkbPoint(hex: string): [number, number] | null {
  if (!/^[0-9a-fA-F]+$/u.test(hex) || hex.length % 2 !== 0) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  const view = new DataView(bytes.buffer);
  if (bytes.length < 21) {
    return null;
  }
  const isLittleEndian = view.getUint8(0) === 1;
  const type = view.getUint32(1, isLittleEndian);
  if ((type & 0xff) !== EWKB_POINT_TYPE) {
    return null;
  }
  const offset = type & EWKB_SRID_FLAG ? 9 : 5;
  if (bytes.length < offset + 16) {
    return null;
  }
  return [view.getFloat64(offset, isLittleEndian), view.getFloat64(offset + 8, isLittleEndian)];
}

type RegionShape = {
  id: string;
  coordinates: readonly (readonly (readonly [number, number])[])[][];
};

function isInsideRing(
  [longitude, latitude]: readonly [number, number],
  ring: readonly (readonly [number, number])[],
): boolean {
  let isInside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index];
    const before = ring[previous];
    if (!current || !before) {
      continue;
    }
    const [x1, y1] = current;
    const [x2, y2] = before;
    if (
      y1 > latitude !== y2 > latitude &&
      longitude < ((x2 - x1) * (latitude - y1)) / (y2 - y1) + x1
    ) {
      isInside = !isInside;
    }
  }
  return isInside;
}

function isInsideRegion(position: readonly [number, number], region: RegionShape): boolean {
  return region.coordinates.some((polygon) => {
    const [outer, ...holes] = polygon;
    return (
      outer !== undefined &&
      isInsideRing(position, outer) &&
      !holes.some((hole) => isInsideRing(position, hole))
    );
  });
}

function regionBox(region: RegionShape): ListingBounds {
  const box = { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity };
  for (const polygon of region.coordinates) {
    for (const [longitude, latitude] of polygon[0] ?? []) {
      box.west = Math.min(box.west, longitude);
      box.east = Math.max(box.east, longitude);
      box.south = Math.min(box.south, latitude);
      box.north = Math.max(box.north, latitude);
    }
  }
  return box;
}

export function countPointsByRegion(
  points: readonly { longitude: number; latitude: number }[],
  regions: readonly RegionShape[],
): Record<string, number> {
  const boxes = regions.map((region) => ({ region, box: regionBox(region) }));
  const counts: Record<string, number> = {};
  for (const point of points) {
    const position = [point.longitude, point.latitude] as const;
    const region = boxes.find(
      ({ region: candidate, box }) =>
        isWithinBounds(point, box) && isInsideRegion(position, candidate),
    )?.region;
    if (region) {
      counts[region.id] = (counts[region.id] ?? 0) + 1;
    }
  }
  return counts;
}

export function isWithinBounds(
  point: { longitude: number; latitude: number },
  bounds: ListingBounds,
): boolean {
  return (
    point.latitude >= bounds.south &&
    point.latitude <= bounds.north &&
    point.longitude >= bounds.west &&
    point.longitude <= bounds.east
  );
}
