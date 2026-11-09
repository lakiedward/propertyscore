import {
  GeoJSONSource,
  type ExpressionSpecification,
  type Map as MapLibreMap,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import { useEffect, useEffectEvent, useState } from 'react';
import type { MapRegions } from './map-canvas';
import { themeColor } from './map.theme';

const MASK_ID = 'ps-regions-mask';
const MASK_WATER_ID = 'ps-regions-mask-water';
const AREAS_ID = 'ps-regions-areas';
const AREAS_LINE_ID = 'ps-regions-areas-line';
const AREAS_HOVER_ID = 'ps-regions-areas-hover';
const AREAS_SELECTED_ID = 'ps-regions-areas-selected';
const OUTLINE_ID = 'ps-regions-outline';
const DETAIL_ZOOM = 8.5;
const WORLD_FRAME: [number, number][] = [
  [-40, 10],
  [80, 10],
  [80, 80],
  [-40, 80],
  [-40, 10],
];

type RegionTooltip = { x: number; y: number; label: string };

const HAS_WEIGHT: ExpressionSpecification = ['>', ['to-number', ['get', 'weight']], 0];

const AREA_FILL_OPACITY: ExpressionSpecification = [
  'step',
  ['zoom'],
  ['case', HAS_WEIGHT, ['+', 0.06, ['*', 0.26, ['to-number', ['get', 'weight']]]], 0],
  DETAIL_ZOOM,
  0,
];

function areaCollection(regions: MapRegions) {
  return {
    type: 'FeatureCollection' as const,
    features: regions.areas.map((area) => ({
      type: 'Feature' as const,
      properties: { id: area.id, label: area.label, weight: area.weight },
      geometry: {
        type: 'MultiPolygon' as const,
        coordinates: area.coordinates.map((polygon) =>
          polygon.map((ring) => ring.map((point) => [...point])),
        ),
      },
    })),
  };
}

function maskFeature(regions: MapRegions) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        WORLD_FRAME,
        ...regions.outline.flatMap((polygon) =>
          polygon.slice(0, 1).map((ring) => ring.map((point) => [...point])),
        ),
      ],
    },
  };
}

function outlineFeature(regions: MapRegions) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'MultiPolygon' as const,
      coordinates: regions.outline.map((polygon) =>
        polygon.map((ring) => ring.map((point) => [...point])),
      ),
    },
  };
}

function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id;
}

function addRegionLayers(map: MapLibreMap, regions: MapRegions) {
  const brand = themeColor('--primary');
  const beforeLabels = firstSymbolLayerId(map);
  map.addSource(AREAS_ID, { type: 'geojson', data: areaCollection(regions), promoteId: 'id' });
  map.addSource(MASK_ID, { type: 'geojson', data: maskFeature(regions) });
  map.addSource(OUTLINE_ID, { type: 'geojson', data: outlineFeature(regions) });
  map.addLayer(
    {
      id: AREAS_ID,
      type: 'fill',
      source: AREAS_ID,
      paint: {
        'fill-color': brand,
        'fill-opacity': AREA_FILL_OPACITY,
      },
    },
    beforeLabels,
  );
  map.addLayer(
    {
      id: AREAS_LINE_ID,
      type: 'line',
      source: AREAS_ID,
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': brand,
        'line-width': ['step', ['zoom'], ['case', HAS_WEIGHT, 0.9, 0.5], DETAIL_ZOOM, 0.8],
        'line-opacity': ['step', ['zoom'], ['case', HAS_WEIGHT, 0.4, 0.18], DETAIL_ZOOM, 0.3],
      },
    },
    beforeLabels,
  );
  map.addLayer({
    id: MASK_ID,
    type: 'fill',
    source: MASK_ID,
    paint: { 'fill-color': themeColor('--map-outside'), 'fill-opacity': 1 },
  });
  const water = map.getStyle().layers.find((layer) => layer.id === 'water');
  if (water?.type === 'fill' && water.source) {
    map.addLayer({
      id: MASK_WATER_ID,
      type: 'fill',
      source: water.source,
      ...(water['source-layer'] ? { 'source-layer': water['source-layer'] } : {}),
      paint: { 'fill-color': themeColor('--map-water') },
    });
  }
  map.addLayer({
    id: AREAS_HOVER_ID,
    type: 'line',
    source: AREAS_ID,
    layout: { 'line-join': 'round' },
    paint: {
      'line-color': brand,
      'line-width': 2,
      'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0],
    },
  });
  map.addLayer({
    id: AREAS_SELECTED_ID,
    type: 'line',
    source: AREAS_ID,
    layout: { 'line-join': 'round' },
    filter: ['==', ['get', 'id'], ''],
    paint: { 'line-color': brand, 'line-width': 2.6, 'line-opacity': 0.95 },
  });
  map.addLayer({
    id: OUTLINE_ID,
    type: 'line',
    source: OUTLINE_ID,
    layout: { 'line-join': 'round' },
    paint: { 'line-color': brand, 'line-width': 2.2, 'line-opacity': 0.9 },
  });
}

function applySelection(map: MapLibreMap, selectedId: string | undefined) {
  const isSelected = selectedId !== undefined;
  map.setFilter(AREAS_SELECTED_ID, ['==', ['get', 'id'], selectedId ?? '']);
  map.setPaintProperty(AREAS_ID, 'fill-opacity', isSelected ? 0 : AREA_FILL_OPACITY);
  map.setLayoutProperty(AREAS_LINE_ID, 'visibility', isSelected ? 'none' : 'visible');
  map.setLayoutProperty(AREAS_HOVER_ID, 'visibility', isSelected ? 'none' : 'visible');
}

export function useMapRegions(
  map: MapLibreMap | undefined,
  isStyleReady: boolean,
  regions: MapRegions | undefined,
): RegionTooltip | undefined {
  const [tooltip, setTooltip] = useState<RegionTooltip>();
  const hasRegions = regions !== undefined;
  const areasKey = regions
    ? regions.areas.map((area) => `${area.id}:${String(area.weight)}:${area.label}`).join('|')
    : '';
  const selectedId = regions?.selectedId;
  const readRegions = useEffectEvent(() => regions);
  const selectRegion = useEffectEvent((id: string) => {
    regions?.onSelect(id);
  });

  useEffect(() => {
    const current = readRegions();
    if (!map || !isStyleReady || !current) {
      return;
    }
    const source = map.getSource(AREAS_ID);
    if (source instanceof GeoJSONSource) {
      void source.setData(areaCollection(current));
      return;
    }
    addRegionLayers(map, current);
    applySelection(map, current.selectedId);
  }, [map, isStyleReady, hasRegions, areasKey]);

  useEffect(() => {
    if (map && isStyleReady && map.getLayer(AREAS_SELECTED_ID)) {
      applySelection(map, selectedId);
    }
  }, [map, isStyleReady, selectedId]);

  const isHoverActive = hasRegions && selectedId === undefined;
  useEffect(() => {
    if (!map || !isStyleReady || !isHoverActive) {
      return;
    }
    let hoveredId: string | number | undefined;
    const clearHover = () => {
      if (hoveredId !== undefined) {
        map.setFeatureState({ source: AREAS_ID, id: hoveredId }, { hover: false });
        hoveredId = undefined;
      }
      map.getCanvas().style.cursor = '';
      setTooltip(undefined);
    };
    const handleMove = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature?.id || map.getZoom() >= DETAIL_ZOOM) {
        clearHover();
        return;
      }
      if (hoveredId !== feature.id) {
        clearHover();
        hoveredId = feature.id;
        map.setFeatureState({ source: AREAS_ID, id: hoveredId }, { hover: true });
      }
      map.getCanvas().style.cursor = 'pointer';
      const label: unknown = feature.properties.label;
      setTooltip({
        x: event.point.x,
        y: event.point.y,
        label: typeof label === 'string' ? label : '',
      });
    };
    map.on('mousemove', AREAS_ID, handleMove);
    map.on('mouseleave', AREAS_ID, clearHover);
    map.on('movestart', clearHover);
    return () => {
      clearHover();
      map.off('mousemove', AREAS_ID, handleMove);
      map.off('mouseleave', AREAS_ID, clearHover);
      map.off('movestart', clearHover);
    };
  }, [map, isStyleReady, isHoverActive]);

  useEffect(() => {
    if (!map || !isStyleReady || !hasRegions) {
      return;
    }
    const handleClick = (event: MapLayerMouseEvent) => {
      const id: unknown = event.features?.[0]?.properties.id;
      if (typeof id === 'string' && map.getZoom() < DETAIL_ZOOM) {
        selectRegion(id);
      }
    };
    map.on('click', AREAS_ID, handleClick);
    return () => {
      map.off('click', AREAS_ID, handleClick);
    };
  }, [map, isStyleReady, hasRegions]);

  return isHoverActive ? tooltip : undefined;
}
