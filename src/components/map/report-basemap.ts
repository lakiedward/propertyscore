import type { Map as MapLibreMap } from 'maplibre-gl';
import { themeColor } from './map.theme';

type PaintTarget = 'background' | 'fill' | 'line';

type PaletteRule = {
  match: readonly string[];
  colors?: Partial<Record<PaintTarget, string>>;
  isHidden?: boolean;
};

const PAINT_PROPERTY = {
  background: 'background-color',
  fill: 'fill-color',
  line: 'line-color',
} as const satisfies Record<PaintTarget, string>;

const REPORT_PALETTE: readonly PaletteRule[] = [
  { match: ['background'], colors: { background: '--report-map-land' } },
  { match: ['park', 'landcover_wood'], colors: { fill: '--report-map-park' } },
  { match: ['water'], colors: { fill: '--report-map-water', line: '--report-map-water' } },
  { match: ['landuse_residential', 'road_area_pier'], colors: { fill: '--report-map-land' } },
  { match: ['building'], colors: { fill: '--report-map-building' } },
  {
    match: ['aeroway'],
    colors: { fill: '--report-map-building', line: '--report-map-aeroway' },
  },
  {
    match: [
      'dashline',
      'shield',
      'boundary',
      'label_other',
      'label_village',
      'label_town',
      'label_city',
      'label_state',
      'label_country',
    ],
    isHidden: true,
  },
  { match: ['railway'], colors: { line: '--report-map-rail' } },
  { match: ['casing'], colors: { line: '--report-map-casing' } },
  { match: ['highway_path'], colors: { line: '--report-map-path' } },
  { match: ['highway', 'tunnel', 'road_pier'], colors: { line: '--report-map-road' } },
];

function isPaintTarget(type: string): type is PaintTarget {
  return type in PAINT_PROPERTY;
}

export function applyReportBasemap(map: MapLibreMap) {
  for (const layer of map.getStyle().layers) {
    const rule = REPORT_PALETTE.find((entry) =>
      entry.match.some((part) => layer.id.includes(part)),
    );
    if (!rule) {
      continue;
    }
    if (rule.isHidden) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
      continue;
    }
    const token = isPaintTarget(layer.type) ? rule.colors?.[layer.type] : undefined;
    if (isPaintTarget(layer.type) && token) {
      map.setPaintProperty(layer.id, PAINT_PROPERTY[layer.type], themeColor(token));
    }
  }
}
