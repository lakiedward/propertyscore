export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';

export type LngLat = [longitude: number, latitude: number];
export type LngLatBounds = [southWest: LngLat, northEast: LngLat];

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
