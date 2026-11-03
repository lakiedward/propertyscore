import type { MapFeatureCollection, MapOverlay } from '@/components/map/map-canvas';
import type { LngLat } from '@/components/map/map.config';
import { circleRing } from './online-report.utils';
import type { FifteenMinuteSection, NoiseSection } from './online-report.types';

type MapFeature = MapFeatureCollection['features'][number];

type SectionGeometry =
  | { type: 'LineString'; coordinates: LngLat[] }
  | { type: 'MultiLineString'; coordinates: LngLat[][] }
  | { type: 'Polygon'; coordinates: LngLat[][] }
  | { type: 'MultiPolygon'; coordinates: LngLat[][][] }
  | { type: 'Point'; coordinates: LngLat }
  | { type: 'MultiPoint'; coordinates: LngLat[] }
  | { type: 'GeometryCollection'; geometries: unknown[] };

export function ringOverlay(id: string, position: LngLat, radiusM: number): MapFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id, radius: String(radiusM) },
        geometry: { type: 'LineString', coordinates: circleRing(position, radiusM) },
      },
    ],
  };
}

export function lineFeatures(
  geometry: SectionGeometry,
  properties: Record<string, string>,
): MapFeature[] {
  if (geometry.type === 'LineString') return [{ type: 'Feature', properties, geometry }];
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.map((coordinates) => ({
      type: 'Feature',
      properties,
      geometry: { type: 'LineString', coordinates },
    }));
  }
  return [];
}

export function areaFeatures(
  geometry: SectionGeometry,
  properties: Record<string, string>,
): MapFeature[] {
  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    return [{ type: 'Feature', properties, geometry }];
  }
  return [];
}

const NOISE_FILL_OPACITY = [0.12, 0.2, 0.3, 0.42, 0.55] as const;

export function noiseBandIndex(dbLow: number, bands: readonly number[]): number {
  return bands.filter((band) => dbLow >= band).length;
}

export function noiseOverlays(
  section: NoiseSection,
  position: LngLat,
  bands: readonly number[],
  showNight: boolean,
): MapOverlay[] {
  const indicator = showNight ? 'lnight' : 'lden';
  const contours = (section.map.contours?.features ?? []).filter(
    (feature) => feature.properties.indicator.toLowerCase() === indicator,
  );
  const byBand = new Map<number, MapFeature[]>();
  for (const contour of contours) {
    const band = noiseBandIndex(contour.properties.db_low, bands);
    const features = areaFeatures(contour.geometry, {
      db_low: String(contour.properties.db_low),
    });
    byBand.set(band, [...(byBand.get(band) ?? []), ...features]);
  }
  const fills: MapOverlay[] = NOISE_FILL_OPACITY.map((opacity, band) => ({
    id: `noise-band-${String(band)}`,
    kind: 'fill',
    colorToken: '--category-safety',
    opacity,
    isVisible: (byBand.get(band) ?? []).length > 0,
    data: { type: 'FeatureCollection', features: byBand.get(band) ?? [] },
  }));
  const lines = (section.map.lines?.features ?? []).flatMap((feature) =>
    lineFeatures(feature.geometry, { kind: feature.properties.kind }),
  );
  return [
    ...fills,
    {
      id: 'noise-sources',
      kind: 'line',
      colorToken: '--category-safety',
      width: 2,
      isVisible: lines.length > 0,
      data: { type: 'FeatureCollection', features: lines },
    },
    {
      id: 'noise-ring',
      kind: 'line',
      colorToken: '--info',
      width: 1.5,
      isVisible: true,
      data: ringOverlay('noise-ring', position, 500),
    },
  ];
}

const ISOCHRONE_OPACITY = [0.28, 0.18, 0.1, 0.06] as const;

export function isochroneOverlays(section: FifteenMinuteSection): MapOverlay[] {
  const ordered = [...section.isochrones].sort((left, right) => left.minutes - right.minutes);
  return ordered.map((isochrone, index) => ({
    id: `isochrone-${String(isochrone.minutes)}`,
    kind: 'fill',
    colorToken: '--category-shopping',
    opacity: ISOCHRONE_OPACITY[index] ?? 0.06,
    outlineWidth: 1,
    isVisible: true,
    data: {
      type: 'FeatureCollection',
      features: areaFeatures(isochrone.geometry, { minutes: String(isochrone.minutes) }),
    },
  }));
}
