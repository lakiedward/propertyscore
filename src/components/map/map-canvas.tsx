import 'maplibre-gl/dist/maplibre-gl.css';
import {
  AttributionControl,
  GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { MAP_STYLE_URL, type LngLat, type LngLatBounds } from './map.config';

setWorkerUrl(mapWorkerUrl);

type MapGeometry =
  | { type: 'LineString'; coordinates: LngLat[] }
  | { type: 'Point'; coordinates: LngLat }
  | { type: 'Polygon'; coordinates: LngLat[][] }
  | { type: 'MultiPolygon'; coordinates: LngLat[][][] };

export type MapFeatureCollection = {
  type: 'FeatureCollection';
  features: { type: 'Feature'; properties: Record<string, string>; geometry: MapGeometry }[];
};

export type MapOverlay = {
  id: string;
  data: MapFeatureCollection;
  isVisible: boolean;
} & (
  | { kind: 'line'; colorToken: string; width: number; hasCasing?: boolean }
  | { kind: 'circle'; colorToken: string; radius: number; opacity: number }
  | { kind: 'fill'; colorToken: string; opacity: number; outlineWidth?: number }
);

export type MapFocus = {
  position: LngLat;
  requestId: number;
};

export type MapViewport = {
  bounds: LngLatBounds;
  zoom: number;
};

export type MapClusterPoint = {
  id: string;
  position: LngLat;
};

export type MapClusterBubble = {
  count: number;
  onExpand: () => void;
};

export type MapClusters = {
  points: readonly MapClusterPoint[];
  renderPoint: (id: string) => ReactNode;
  renderCluster: (cluster: MapClusterBubble) => ReactNode;
};

type ClusterItem = { key: string; position: LngLat } & (
  { kind: 'point'; id: string } | { kind: 'cluster'; clusterId: number; count: number }
);

const CLUSTER_SOURCE_ID = 'ps-clusters';
const CLUSTER_LAYER_ID = 'ps-clusters-hit';
const CLUSTER_RADIUS = 48;
const CLUSTER_MAX_ZOOM = 15;

export type MapMarkerItem = {
  id: string;
  position: LngLat;
  node: ReactNode;
  anchor?: 'bottom' | 'center' | 'left';
};

type MapCanvasProps = {
  label: string;
  center: LngLat;
  zoom: number;
  bounds?: LngLatBounds | undefined;
  focus?: MapFocus | undefined;
  markers: readonly MapMarkerItem[];
  overlays?: readonly MapOverlay[];
  clusters?: MapClusters | undefined;
  onError: () => void;
  onPick?: (position: LngLat) => void;
  onViewportChange?: (viewport: MapViewport) => void;
  hidesPointsOfInterest?: boolean;
  isScrollZoomEnabled?: boolean;
  isPrintable?: boolean;
  className?: string;
};

type MapLabels = {
  zoomIn: string;
  zoomOut: string;
  title: string;
  toggleAttribution: string;
  mapFeedback: string;
};

function themeColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function labelElement(container: HTMLElement, selector: string, text: string) {
  const element = container.querySelector(selector);
  if (element) {
    element.setAttribute('title', text);
    element.setAttribute('aria-label', text);
  }
}

function applyLabels(map: MapLibreMap, labels: MapLabels) {
  const container = map.getContainer();
  labelElement(container, '.maplibregl-ctrl-zoom-in', labels.zoomIn);
  labelElement(container, '.maplibregl-ctrl-zoom-out', labels.zoomOut);
  labelElement(container, '.maplibregl-ctrl-attrib-button', labels.toggleAttribution);
  map.getCanvas().setAttribute('aria-label', labels.title);
}

export function MapCanvas({
  label,
  center,
  zoom,
  bounds,
  focus,
  markers,
  overlays = [],
  clusters,
  onError,
  onPick,
  onViewportChange,
  hidesPointsOfInterest = false,
  isScrollZoomEnabled = false,
  isPrintable = false,
  className,
}: MapCanvasProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap>();
  const [isStyleReady, setIsStyleReady] = useState(false);
  const appliedOverlays = useRef(new Map<string, string>());
  const [clusterItems, setClusterItems] = useState<readonly ClusterItem[]>([]);
  const initialView = useRef({
    center,
    zoom,
    isPrintable,
    hidesPointsOfInterest,
    isScrollZoomEnabled,
  });
  const labels: MapLabels = {
    zoomIn: t('map.zoomIn'),
    zoomOut: t('map.zoomOut'),
    title: t('map.title'),
    toggleAttribution: t('map.toggleAttribution'),
    mapFeedback: t('map.mapFeedback'),
  };
  const reportError = useEffectEvent(() => {
    onError();
  });
  const readLabels = useEffectEvent(() => labels);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const initialLabels = readLabels();
    let instance: MapLibreMap;
    try {
      instance = new MapLibreMap({
        container,
        style: MAP_STYLE_URL,
        center: initialView.current.center,
        zoom: initialView.current.zoom,
        attributionControl: false,
        scrollZoom: initialView.current.isScrollZoomEnabled,
        canvasContextAttributes: { preserveDrawingBuffer: initialView.current.isPrintable },
        locale: {
          'Map.Title': initialLabels.title,
          'NavigationControl.ZoomIn': initialLabels.zoomIn,
          'NavigationControl.ZoomOut': initialLabels.zoomOut,
          'AttributionControl.ToggleAttribution': initialLabels.toggleAttribution,
          'AttributionControl.MapFeedback': initialLabels.mapFeedback,
        },
      });
    } catch {
      reportError();
      return;
    }
    const overlayRegistry = appliedOverlays.current;
    instance.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    instance.addControl(new AttributionControl({ compact: true }), 'bottom-right');
    instance.on('style.load', () => {
      if (instance.getLayer('background')) {
        instance.setPaintProperty('background', 'background-color', themeColor('--background'));
      }
      if (instance.getLayer('water')) {
        instance.setPaintProperty('water', 'fill-color', themeColor('--map-water'));
      }
      if (initialView.current.hidesPointsOfInterest) {
        for (const layer of instance.getStyle().layers) {
          if (layer.id.startsWith('poi')) {
            instance.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        }
      }
      overlayRegistry.clear();
      setIsStyleReady(true);
    });
    instance.on('error', () => {
      if (!instance.isStyleLoaded()) {
        reportError();
      }
    });
    const resizeObserver = new ResizeObserver(() => {
      instance.resize();
    });
    resizeObserver.observe(container);
    setMap(instance);
    return () => {
      resizeObserver.disconnect();
      instance.remove();
      overlayRegistry.clear();
      setMap(undefined);
      setIsStyleReady(false);
    };
  }, []);

  useEffect(() => {
    if (map) {
      applyLabels(map, {
        zoomIn: labels.zoomIn,
        zoomOut: labels.zoomOut,
        title: labels.title,
        toggleAttribution: labels.toggleAttribution,
        mapFeedback: labels.mapFeedback,
      });
    }
  }, [
    map,
    labels.zoomIn,
    labels.zoomOut,
    labels.title,
    labels.toggleAttribution,
    labels.mapFeedback,
  ]);

  useEffect(() => {
    if (!map || !isStyleReady) {
      return;
    }
    syncOverlays(map, overlays, appliedOverlays.current);
  }, [map, isStyleReady, overlays]);

  const fitToBounds = useEffectEvent((target: MapLibreMap) => {
    if (bounds) {
      target.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
    }
  });
  const boundsKey = bounds ? bounds.flat().join(',') : '';
  useEffect(() => {
    if (map) {
      fitToBounds(map);
    }
  }, [map, boundsKey]);

  const pickPosition = useEffectEvent((position: LngLat) => {
    onPick?.(position);
  });
  const isPickable = onPick !== undefined;
  useEffect(() => {
    if (!map || !isPickable) {
      return;
    }
    const handleClick = (event?: { lngLat: { lng: number; lat: number } }) => {
      if (event) {
        pickPosition([event.lngLat.lng, event.lngLat.lat]);
      }
    };
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, isPickable]);

  const reportViewport = useEffectEvent((target: MapLibreMap) => {
    const visible = target.getBounds();
    onViewportChange?.({
      bounds: [
        [visible.getWest(), visible.getSouth()],
        [visible.getEast(), visible.getNorth()],
      ],
      zoom: target.getZoom(),
    });
  });
  const isViewportTracked = onViewportChange !== undefined;
  useEffect(() => {
    if (!map || !isStyleReady || !isViewportTracked) {
      return;
    }
    const handleMoveEnd = () => {
      reportViewport(map);
    };
    handleMoveEnd();
    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, isStyleReady, isViewportTracked]);

  const clusterPoints = clusters?.points;
  const clusterPointsKey = clusterPoints
    ? clusterPoints.map((point) => `${point.id}:${point.position.join(',')}`).join('|')
    : '';
  const readClusterPoints = useEffectEvent(() => clusterPoints ?? []);
  const hasClusters = clusterPoints !== undefined;
  useEffect(() => {
    if (!map || !isStyleReady || !hasClusters) {
      return;
    }
    const data = pointCollection(readClusterPoints());
    const source = map.getSource(CLUSTER_SOURCE_ID);
    if (source instanceof GeoJSONSource) {
      void source.setData(data);
      return;
    }
    map.addSource(CLUSTER_SOURCE_ID, {
      type: 'geojson',
      data,
      cluster: true,
      clusterRadius: CLUSTER_RADIUS,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
    });
    map.addLayer({
      id: CLUSTER_LAYER_ID,
      type: 'circle',
      source: CLUSTER_SOURCE_ID,
      paint: { 'circle-radius': 1, 'circle-opacity': 0 },
    });
  }, [map, isStyleReady, hasClusters, clusterPointsKey]);

  useEffect(() => {
    if (!map || !isStyleReady || !hasClusters) {
      return;
    }
    const refresh = () => {
      const next = readClusterItems(map);
      setClusterItems((current) => (sameItems(current, next) ? current : next));
    };
    const handleSourceData = (event?: { sourceId?: string; isSourceLoaded?: boolean }) => {
      if (event?.sourceId === CLUSTER_SOURCE_ID && event.isSourceLoaded) {
        refresh();
      }
    };
    map.on('moveend', refresh);
    map.on('sourcedata', handleSourceData);
    return () => {
      map.off('moveend', refresh);
      map.off('sourcedata', handleSourceData);
    };
  }, [map, isStyleReady, hasClusters]);

  const expandCluster = (target: MapLibreMap, clusterId: number, position: LngLat) => {
    const source = target.getSource(CLUSTER_SOURCE_ID);
    if (source instanceof GeoJSONSource) {
      void source.getClusterExpansionZoom(clusterId).then((expansionZoom) => {
        target.easeTo({ center: position, zoom: expansionZoom });
      });
    }
  };

  const moveToFocus = useEffectEvent((target: MapLibreMap) => {
    if (focus) {
      target.easeTo({ center: focus.position });
    }
  });
  const focusRequestId = focus?.requestId;
  useEffect(() => {
    if (map && focusRequestId !== undefined) {
      moveToFocus(map);
    }
  }, [map, focusRequestId]);

  return (
    <div
      role="region"
      aria-label={label}
      className={cn('relative overflow-hidden rounded-xl bg-surface-alt', className)}
    >
      <div ref={containerRef} className="size-full" />
      {map
        ? markers.map((marker) => (
            <MapMarker
              key={marker.id}
              map={map}
              position={marker.position}
              anchor={marker.anchor ?? 'bottom'}
            >
              {marker.node}
            </MapMarker>
          ))
        : null}
      {map && clusters
        ? clusterItems.map((item) => (
            <MapMarker
              key={item.key}
              map={map}
              position={item.position}
              anchor={item.kind === 'cluster' ? 'center' : 'bottom'}
            >
              {item.kind === 'cluster'
                ? clusters.renderCluster({
                    count: item.count,
                    onExpand: () => {
                      expandCluster(map, item.clusterId, item.position);
                    },
                  })
                : clusters.renderPoint(item.id)}
            </MapMarker>
          ))
        : null}
    </div>
  );
}

function pointCollection(points: readonly MapClusterPoint[]): MapFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((point) => ({
      type: 'Feature',
      properties: { id: point.id },
      geometry: { type: 'Point', coordinates: point.position },
    })),
  };
}

function pointPosition(geometry: unknown): LngLat | undefined {
  if (
    typeof geometry !== 'object' ||
    geometry === null ||
    !('type' in geometry) ||
    geometry.type !== 'Point' ||
    !('coordinates' in geometry) ||
    !Array.isArray(geometry.coordinates)
  ) {
    return undefined;
  }
  const coordinates: unknown[] = geometry.coordinates;
  const [longitude, latitude] = coordinates;
  return typeof longitude === 'number' && typeof latitude === 'number'
    ? [longitude, latitude]
    : undefined;
}

function readClusterItems(map: MapLibreMap): ClusterItem[] {
  const visible = map.getBounds();
  const items = new Map<string, ClusterItem>();
  for (const feature of map.querySourceFeatures(CLUSTER_SOURCE_ID)) {
    const geometry: unknown = feature.geometry;
    const position = pointPosition(geometry);
    if (!position || !visible.contains(position)) {
      continue;
    }
    const properties: Record<string, unknown> = feature.properties;
    const clusterId = properties.cluster_id;
    const count = properties.point_count;
    const id = properties.id;
    if (typeof clusterId === 'number' && typeof count === 'number') {
      const key = `cluster-${String(clusterId)}`;
      items.set(key, { key, position, kind: 'cluster', clusterId, count });
    } else if (typeof id === 'string') {
      const key = `point-${id}`;
      items.set(key, { key, position, kind: 'point', id });
    }
  }
  return [...items.values()];
}

function sameItems(current: readonly ClusterItem[], next: readonly ClusterItem[]): boolean {
  return (
    current.length === next.length &&
    current.every((item, index) => {
      const other = next[index];
      return (
        other?.key === item.key &&
        other.position[0] === item.position[0] &&
        other.position[1] === item.position[1]
      );
    })
  );
}

function overlayLayerIds(id: string): string[] {
  return [id, `${id}-casing`];
}

function removeOverlay(map: MapLibreMap, id: string) {
  for (const layerId of overlayLayerIds(id)) {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  }
  if (map.getSource(id)) {
    map.removeSource(id);
  }
}

function syncOverlays(
  map: MapLibreMap,
  overlays: readonly MapOverlay[],
  registry: Map<string, string>,
) {
  const nextIds = new Set(overlays.map((overlay) => overlay.id));
  for (const id of registry.keys()) {
    if (!nextIds.has(id)) {
      removeOverlay(map, id);
      registry.delete(id);
    }
  }
  for (const overlay of overlays) {
    const data = JSON.stringify(overlay.data);
    const source = map.getSource(overlay.id);
    if (!source) {
      addOverlay(map, overlay);
    } else if (registry.get(overlay.id) !== data && source instanceof GeoJSONSource) {
      void source.setData(overlay.data);
    }
    registry.set(overlay.id, data);
    const visibility = overlay.isVisible ? 'visible' : 'none';
    for (const layerId of overlayLayerIds(overlay.id)) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    }
  }
}

function addOverlay(map: MapLibreMap, overlay: MapOverlay) {
  map.addSource(overlay.id, { type: 'geojson', data: overlay.data });
  const color = themeColor(overlay.colorToken);
  if (overlay.kind === 'line') {
    if (overlay.hasCasing) {
      map.addLayer({
        id: `${overlay.id}-casing`,
        type: 'line',
        source: overlay.id,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': themeColor('--card'), 'line-width': overlay.width + 4 },
      });
    }
    map.addLayer({
      id: overlay.id,
      type: 'line',
      source: overlay.id,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': color, 'line-width': overlay.width },
    });
    return;
  }
  if (overlay.kind === 'fill') {
    map.addLayer({
      id: overlay.id,
      type: 'fill',
      source: overlay.id,
      paint: { 'fill-color': color, 'fill-opacity': overlay.opacity },
    });
    if (overlay.outlineWidth) {
      map.addLayer({
        id: `${overlay.id}-casing`,
        type: 'line',
        source: overlay.id,
        paint: { 'line-color': color, 'line-width': overlay.outlineWidth },
      });
    }
    return;
  }
  map.addLayer({
    id: overlay.id,
    type: 'circle',
    source: overlay.id,
    paint: {
      'circle-color': color,
      'circle-radius': overlay.radius,
      'circle-opacity': overlay.opacity,
    },
  });
}

type MapMarkerProps = {
  map: MapLibreMap;
  position: LngLat;
  anchor: 'bottom' | 'center' | 'left';
  children: ReactNode;
};

function MapMarker({ map, position, anchor, children }: MapMarkerProps) {
  const [element] = useState(() => document.createElement('div'));
  const [longitude, latitude] = position;

  useEffect(() => {
    const marker = new Marker({ element, anchor }).setLngLat([longitude, latitude]).addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, element, anchor, longitude, latitude]);

  return createPortal(children, element);
}
