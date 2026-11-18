import { esc } from './format.ts';

type Position = [number, number];

type Geometry = { type: string; [key: string]: unknown };

type Feature = { type: 'Feature'; properties: Record<string, unknown> | null; geometry: Geometry };

export type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };

type MapLayer = {
  kind: 'fill' | 'line' | 'circle';
  data: FeatureCollection;
  color: string;
  opacity?: number;
  width?: number;
  radius?: number;
  dashed?: boolean;
};

type MapMarker = { position: Position; label?: string; color?: string };

export type MapSpec = {
  id: string;
  center: Position;
  zoom?: number;
  fit?: Position[];
  layers: MapLayer[];
  markers: MapMarker[];
};

const EARTH_RADIUS_M = 6_371_008.8;
const CIRCLE_STEPS = 72;

export const MAP_TILE_HOST = 'tiles.openfreemap.org';
const MAP_STYLE_URL = `https://${MAP_TILE_HOST}/styles/bright`;

export function collection(geometries: readonly Geometry[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: geometries.map((geometry) => ({ type: 'Feature', properties: {}, geometry })),
  };
}

export function points(positions: readonly Position[]): FeatureCollection {
  return collection(positions.map((coordinates) => ({ type: 'Point', coordinates })));
}

function offsetPosition(center: Position, radiusM: number, bearingRad: number): Position {
  const latitude = (center[1] * Math.PI) / 180;
  const deltaLat = (radiusM / EARTH_RADIUS_M) * Math.cos(bearingRad);
  const deltaLng = ((radiusM / EARTH_RADIUS_M) * Math.sin(bearingRad)) / Math.cos(latitude);
  return [center[0] + (deltaLng * 180) / Math.PI, center[1] + (deltaLat * 180) / Math.PI];
}

export function ring(center: Position, radiusM: number): FeatureCollection {
  const coordinates = Array.from({ length: CIRCLE_STEPS + 1 }, (_, step) =>
    offsetPosition(center, radiusM, (step / CIRCLE_STEPS) * 2 * Math.PI),
  );
  return collection([{ type: 'LineString', coordinates }]);
}

export function around(center: Position, radiusM: number): Position[] {
  return [0, 0.5, 1, 1.5].map((quarter) => offsetPosition(center, radiusM, quarter * Math.PI));
}

export function mapHtml(spec: MapSpec, heightMm: number, credit = '© OpenStreetMap'): string {
  return `<div class="map" style="height:${String(heightMm)}mm"><div class="map-canvas" id="${esc(spec.id)}"></div><span class="map-credit">${esc(credit)}</span></div>`;
}

export function mapSpecsScript(specs: readonly MapSpec[]): string {
  const json = JSON.stringify({ style: MAP_STYLE_URL, maps: specs }).replace(/</g, '\\u003c');
  return `<script type="application/json" id="map-specs">${json}</script>`;
}

function metresBetween(from: Position, to: Position): number {
  const latitude = ((from[1] + to[1]) / 2) * (Math.PI / 180);
  const east = (to[0] - from[0]) * (Math.PI / 180) * Math.cos(latitude);
  const north = (to[1] - from[1]) * (Math.PI / 180);
  return Math.hypot(east, north) * EARTH_RADIUS_M;
}

export function within(
  center: Position,
  positions: readonly Position[],
  radiusM: number,
): Position[] {
  const near = positions.filter((position) => metresBetween(center, position) <= radiusM);
  return near.length > 0 ? near : around(center, radiusM / 2);
}
