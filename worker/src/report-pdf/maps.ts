import { esc } from './format.ts';

type Position = [number, number];

type Geometry = { type: string; [key: string]: unknown };

type Feature = { type: 'Feature'; properties: Record<string, unknown> | null; geometry: Geometry };

export type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };

type ImageLayer = {
  kind: 'image';
  coordinates: [Position, Position, Position, Position];
  width: number;
  height: number;
  rgba: number[];
};

type VectorLayer = {
  kind: 'fill' | 'line' | 'circle';
  data: FeatureCollection;
  color: string;
  opacity?: number;
  width?: number;
  radius?: number;
  dotted?: boolean;
  outline?: string;
  colorProperty?: string;
};

type MapLayer = VectorLayer | ImageLayer;

export type MapMarker = {
  position: Position;
  html: string;
  anchor?: 'center' | 'bottom' | 'left' | 'right' | 'top';
  offset?: [number, number];
};

export type MapSpec = {
  id: string;
  center: Position;
  zoom?: number;
  fit?: Position[];
  padding?: number;
  maxZoom?: number;
  layers: MapLayer[];
  markers: MapMarker[];
};

const EARTH_RADIUS_M = 6_371_008.8;
const CIRCLE_STEPS = 72;

export const MAP_TILE_HOST = 'tiles.openfreemap.org';
const MAP_STYLE_URL = `https://${MAP_TILE_HOST}/styles/positron`;

type PaletteRule = {
  match: readonly string[];
  hide?: true;
  paint?: Partial<Record<'background' | 'fill' | 'line', { name: string; value: string }>>;
};

const fill = (value: string) => ({ name: 'fill-color', value });
const line = (value: string) => ({ name: 'line-color', value });

const MAP_PALETTE: readonly PaletteRule[] = [
  { match: ['background'], paint: { background: { name: 'background-color', value: '#EFEDE3' } } },
  { match: ['park', 'landcover_wood'], paint: { fill: fill('#D8E5C4') } },
  { match: ['water'], paint: { fill: fill('#C9DCE3'), line: line('#C9DCE3') } },
  { match: ['landuse_residential', 'road_area_pier'], paint: { fill: fill('#EFEDE3') } },
  { match: ['building'], paint: { fill: fill('#E6E3D5') } },
  { match: ['aeroway'], paint: { fill: fill('#E6E3D5'), line: line('#E0DDCF') } },
  { match: ['dashline', 'shield', 'boundary'], hide: true },
  { match: ['railway'], paint: { line: line('#C9C5B4') } },
  { match: ['casing'], paint: { line: line('#DCD8C7') } },
  { match: ['highway_path'], paint: { line: line('#F7F6EF') } },
  { match: ['highway', 'tunnel', 'road_pier'], paint: { line: line('#FFFFFF') } },
];

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

const ADDRESS_PIN =
  '<svg viewBox="0 0 28 36" aria-hidden="true"><path d="M14 35C14 35 26 22.6 26 13.5A12 12 0 0 0 2 13.5C2 22.6 14 35 14 35Z" fill="#103F32" stroke="#fff" stroke-width="2"/><circle cx="14" cy="13.5" r="5" fill="#DDED69"/></svg>';

export function addressMarker(position: Position, label?: string): MapMarker {
  const text = label ? `<span class="apin-l">${esc(label)}</span>` : '';
  return { position, html: `<span class="apin">${ADDRESS_PIN}${text}</span>`, anchor: 'bottom' };
}

export function addressDot(position: Position): MapMarker {
  return { position, html: '<span class="adot"></span>' };
}

export function mapHtml(spec: MapSpec, overlays = '', className = ''): string {
  return `<div class="map ${className}"><div class="map-canvas" id="${esc(spec.id)}"></div>${overlays}<div class="attr">© OpenStreetMap contributors</div></div>`;
}

export function mapSpecsScript(specs: readonly MapSpec[]): string {
  const json = JSON.stringify({ style: MAP_STYLE_URL, palette: MAP_PALETTE, maps: specs }).replace(
    /</g,
    '\\u003c',
  );
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
