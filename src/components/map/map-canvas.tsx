import 'maplibre-gl/dist/maplibre-gl.css';
import {
  AttributionControl,
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
  { type: 'LineString'; coordinates: LngLat[] } | { type: 'Point'; coordinates: LngLat };

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
);

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
  focus?: LngLat | undefined;
  markers: readonly MapMarkerItem[];
  overlays?: readonly MapOverlay[];
  onError: () => void;
  className?: string;
};

function themeColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function MapCanvas({
  label,
  center,
  zoom,
  bounds,
  focus,
  markers,
  overlays = [],
  onError,
  className,
}: MapCanvasProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap>();
  const [isStyleReady, setIsStyleReady] = useState(false);
  const reportError = useEffectEvent(() => {
    onError();
  });
  const initialView = useRef({ center, zoom });
  const zoomInLabel = t('map.zoomIn');
  const zoomOutLabel = t('map.zoomOut');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    let instance: MapLibreMap;
    try {
      instance = new MapLibreMap({
        container,
        style: MAP_STYLE_URL,
        center: initialView.current.center,
        zoom: initialView.current.zoom,
        attributionControl: false,
        scrollZoom: false,
        locale: {
          'NavigationControl.ZoomIn': zoomInLabel,
          'NavigationControl.ZoomOut': zoomOutLabel,
        },
      });
    } catch {
      reportError();
      return;
    }
    instance.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    instance.addControl(new AttributionControl({ compact: true }), 'bottom-right');
    instance.on('style.load', () => {
      if (instance.getLayer('background')) {
        instance.setPaintProperty('background', 'background-color', themeColor('--background'));
      }
      if (instance.getLayer('water')) {
        instance.setPaintProperty('water', 'fill-color', themeColor('--map-water'));
      }
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
      setMap(undefined);
      setIsStyleReady(false);
    };
  }, [zoomInLabel, zoomOutLabel]);

  useEffect(() => {
    if (!map || !isStyleReady) {
      return;
    }
    for (const overlay of overlays) {
      applyOverlay(map, overlay);
    }
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

  const moveToFocus = useEffectEvent((target: MapLibreMap) => {
    if (focus) {
      target.easeTo({ center: focus });
    }
  });
  const focusKey = focus ? focus.join(',') : '';
  useEffect(() => {
    if (map) {
      moveToFocus(map);
    }
  }, [map, focusKey]);

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
    </div>
  );
}

function applyOverlay(map: MapLibreMap, overlay: MapOverlay) {
  const visibility = overlay.isVisible ? 'visible' : 'none';
  if (!map.getSource(overlay.id)) {
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
    } else {
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
  }
  for (const layerId of [overlay.id, `${overlay.id}-casing`]) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visibility);
    }
  }
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
