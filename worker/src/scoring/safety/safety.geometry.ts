const EARTH_RADIUS_KM = 6371.0088;

type Position = readonly [number, number];

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineKm(from: Position, to: Position): number {
  const dLat = radians(to[1] - from[1]);
  const dLon = radians(to[0] - from[0]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(from[1])) * Math.cos(radians(to[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function pathKm(coordinates: unknown): number {
  if (!Array.isArray(coordinates)) return 0;
  let total = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const from: unknown = coordinates[index - 1];
    const to: unknown = coordinates[index];
    if (isPosition(from) && isPosition(to)) total += haversineKm(from, to);
  }
  return total;
}

export function lineLengthKm(geometry: { type: string; coordinates: unknown }): number {
  if (geometry.type === 'LineString') return pathKm(geometry.coordinates);
  if (geometry.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.reduce<number>((sum, line: unknown) => sum + pathKm(line), 0);
  }
  return 0;
}
