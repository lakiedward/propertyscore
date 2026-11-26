import type { LngLat } from '@/components/map/map.config';
import type { MapFeatureCollection, MapOverlay } from '@/components/map/map-canvas';
import { lineCollection, ringAround } from '@/components/report/report-map.utils';
import {
  chipOfType,
  safetyTypeMeta,
  type NearestElement,
  type SafetyElements,
  type SafetyWhen,
} from './safety.utils';

const DIMMED_OPACITY = 0.1;
const NEAREST_LINE_MIN_M = 20;

type LayerState = {
  when: SafetyWhen;
  hiddenChips: ReadonlySet<string>;
  focusedChip: string | null;
};

function ofChip<T>(groups: Readonly<Record<string, readonly T[]>>, chip: string): T[] {
  return Object.entries(groups).flatMap(([type, items]) =>
    chipOfType(type) === chip ? items : [],
  );
}

function ofType<T>(groups: Readonly<Record<string, readonly T[]>>, type: string): T[] {
  return [...(groups[type] ?? [])];
}

function pointCollection(points: readonly LngLat[]): MapFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((coordinates) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates },
    })),
  };
}

function polygonCollection(polygons: readonly LngLat[][][]): MapFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: polygons.map((coordinates) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates },
    })),
  };
}

export function safetyElementOverlays(
  elements: SafetyElements,
  { when, hiddenChips, focusedChip }: LayerState,
): MapOverlay[] {
  const opacityOf = (chip: string) =>
    focusedChip !== null && focusedChip !== chip ? DIMMED_OPACITY : 1;
  const idOf = (name: string, chip: string) =>
    `safety-${name}-${when}-${opacityOf(chip) === 1 ? 'on' : 'dim'}`;
  const isNight = when === 'night';
  const overlays: MapOverlay[] = [];

  const parks = ofType(elements.areas, 'park');
  const litParks = ofType(elements.areas, 'park_lit');
  if (parks.length > 0) {
    overlays.push({
      id: idOf('park', 'park'),
      kind: 'fill',
      data: polygonCollection(parks),
      isVisible: !hiddenChips.has('park'),
      colorToken: '--ps-ink-900',
      opacity: (isNight ? 0.16 : 0.06) * opacityOf('park'),
      outlineWidth: 1.4,
      outlineColorToken: safetyTypeMeta('park').colorVar,
      outlineDash: [3, 2],
      outlineOpacity: opacityOf('park'),
    });
  }
  if (litParks.length > 0) {
    overlays.push({
      id: idOf('park-lit', 'park'),
      kind: 'fill',
      data: polygonCollection(litParks),
      isVisible: !hiddenChips.has('park'),
      colorToken: '--ps-ink-900',
      opacity: 0,
      outlineWidth: 1.4,
      outlineColorToken: '--ps-amber-400',
      outlineOpacity: opacityOf('park'),
    });
  }

  const passages = ofChip(elements.lines, 'isolated_passage');
  if (passages.length > 0) {
    overlays.push({
      id: idOf('isolated', 'isolated_passage'),
      kind: 'line',
      data: lineCollection(passages),
      isVisible: !hiddenChips.has('isolated_passage'),
      colorToken: safetyTypeMeta('isolated_passage').colorVar,
      width: 2.6,
      dash: [2, 1.5],
      opacity: opacityOf('isolated_passage'),
    });
  }

  const litWays = ofChip(elements.lines, 'lighting');
  if (litWays.length > 0) {
    if (isNight) {
      overlays.push({
        id: idOf('lighting-glow', 'lighting'),
        kind: 'line',
        data: lineCollection(litWays),
        isVisible: !hiddenChips.has('lighting'),
        colorToken: '--ps-sun-300',
        width: 7,
        opacity: 0.28 * opacityOf('lighting'),
      });
    }
    overlays.push({
      id: idOf('lighting-ways', 'lighting'),
      kind: 'line',
      data: lineCollection(litWays),
      isVisible: !hiddenChips.has('lighting'),
      colorToken: '--ps-amber-400',
      width: isNight ? 1.5 : 1.1,
      opacity: (isNight ? 1 : 0.5) * opacityOf('lighting'),
    });
  }

  const dots = [
    { chip: 'lighting', fill: '--ps-sun-300', stroke: '--ps-amber-700', radius: 3.4 },
    { chip: 'shop', fill: safetyTypeMeta('shop').colorVar, stroke: '--card', radius: 2.6 },
    {
      chip: 'transit_stop',
      fill: safetyTypeMeta('transit_stop').colorVar,
      stroke: '--card',
      radius: 2.6,
    },
    { chip: 'bar', fill: safetyTypeMeta('bar').colorVar, stroke: '--card', radius: 3.2 },
  ] as const;
  for (const dot of dots) {
    const points = ofChip(elements.points, dot.chip);
    if (points.length === 0) continue;
    overlays.push({
      id: idOf(`${dot.chip}-points`, dot.chip),
      kind: 'circle',
      data: pointCollection(points),
      isVisible: !hiddenChips.has(dot.chip),
      colorToken: dot.fill,
      radius: dot.radius,
      opacity: opacityOf(dot.chip),
      strokeColorToken: dot.stroke,
      strokeWidth: 1,
    });
  }

  return overlays;
}

export function safetyFocusOverlays(
  center: LngLat,
  chip: string,
  reachM: number | undefined,
  nearest: NearestElement | null,
): MapOverlay[] {
  const colorToken = safetyTypeMeta(chip).colorVar;
  const overlays: MapOverlay[] = [];
  if (reachM !== undefined) {
    const ring = ringAround(center, reachM);
    const [feature] = ring.features;
    if (feature?.geometry.type === 'LineString') {
      overlays.push(
        {
          id: `safety-focus-area-${chip}`,
          kind: 'fill',
          data: polygonCollection([[feature.geometry.coordinates]]),
          isVisible: true,
          colorToken,
          opacity: 0.08,
        },
        {
          id: `safety-focus-ring-${chip}`,
          kind: 'line',
          data: ring,
          isVisible: true,
          colorToken,
          width: 2,
          dash: [3, 2.5],
        },
      );
    }
  }
  if (nearest && nearest.distanceM > NEAREST_LINE_MIN_M && chip !== 'lighting') {
    overlays.push({
      id: `safety-focus-nearest-${chip}`,
      kind: 'line',
      data: lineCollection([[center, nearest.position]]),
      isVisible: true,
      colorToken,
      width: 2.4,
      dash: [0.4, 2],
    });
  }
  return overlays;
}
