import type { LngLat, LngLatBounds } from './map.config';

export function boundsOf(points: readonly LngLat[]): LngLatBounds | undefined {
  const [first, ...rest] = points;
  if (!first) {
    return undefined;
  }
  let [west, south] = first;
  let [east, north] = first;
  for (const [longitude, latitude] of rest) {
    west = Math.min(west, longitude);
    east = Math.max(east, longitude);
    south = Math.min(south, latitude);
    north = Math.max(north, latitude);
  }
  return [
    [west, south],
    [east, north],
  ];
}

const TILE_SIZE = 512;

export type MapTileAddress = { z: number; x: number; y: number };

function mercatorX(longitude: number): number {
  return (longitude + 180) / 360;
}

function mercatorY(latitude: number): number {
  const radians = (latitude * Math.PI) / 180;
  return (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
}

function fittedZoom(
  bounds: LngLatBounds,
  viewport: { width: number; height: number },
  padding: number,
): number {
  const [[west, south], [east, north]] = bounds;
  const spanX = mercatorX(east) - mercatorX(west);
  const spanY = mercatorY(south) - mercatorY(north);
  return Math.min(
    Math.log2((viewport.width - 2 * padding) / (TILE_SIZE * spanX)),
    Math.log2((viewport.height - 2 * padding) / (TILE_SIZE * spanY)),
  );
}

export function tilesInView(
  bounds: LngLatBounds,
  viewport: { width: number; height: number },
  padding: number,
  zoomRange: { min: number; max: number },
): MapTileAddress[] {
  const zoom = fittedZoom(bounds, viewport, padding);
  const tileZoom = Math.min(zoomRange.max, Math.max(zoomRange.min, Math.floor(zoom)));
  const tilesPerSide = 2 ** tileZoom;
  const pixelsPerTile = TILE_SIZE * 2 ** (zoom - tileZoom);
  const [[west, south], [east, north]] = bounds;
  const centerX = ((mercatorX(west) + mercatorX(east)) / 2) * tilesPerSide;
  const centerY = ((mercatorY(south) + mercatorY(north)) / 2) * tilesPerSide;
  const halfWidth = viewport.width / pixelsPerTile / 2;
  const halfHeight = viewport.height / pixelsPerTile / 2;
  const clamp = (value: number) => Math.min(tilesPerSide - 1, Math.max(0, Math.floor(value)));
  const tiles: MapTileAddress[] = [];
  for (let x = clamp(centerX - halfWidth); x <= clamp(centerX + halfWidth); x += 1) {
    for (let y = clamp(centerY - halfHeight); y <= clamp(centerY + halfHeight); y += 1) {
      tiles.push({ z: tileZoom, x, y });
    }
  }
  return tiles;
}
