import 'maplibre-gl/dist/maplibre-gl.css';
import {
  AttributionControl,
  GeoJSONSource,
  ImageSource,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  prewarm,
  setWorkerUrl,
  type RequestParameters,
} from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  MAP_STYLE_URL,
  REPORT_MAP_STYLE_URL,
  type LngLat,
  type LngLatBounds,
  type MapBasemap,
} from './map.config';
import { applyReportBasemap } from './report-basemap';
import { removeLayersAndSource } from './map-layers';
import { themeColor } from './map.theme';
import {
  tileRequestPrefix,
  useMapListingTiles,
  type MapListingTiles,
} from './use-map-listing-tiles';
import { useMapRegions } from './use-map-regions';

setWorkerUrl(mapWorkerUrl);
prewarm();

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

export type MapImageOverlay = {
  id: string;
  url: string;
  coordinates: [LngLat, LngLat, LngLat, LngLat];
  opacity: number;
  isVisible: boolean;
};

export type MapFocus = {
  position: LngLat;
  zoom?: number;
  requestId: number;
};

export type MapCanvasController = {
  zoomIn: () => void;
  zoomOut: () => void;
  fitBounds: (bounds: LngLatBounds) => void;
};

type RegionPolygon = readonly (readonly (readonly [number, number])[])[];

export type MapRegionArea = {
  id: string;
  label: string;
  weight: number;
  coordinates: readonly RegionPolygon[];
};

export type MapRegions = {
  outline: readonly RegionPolygon[];
  areas: readonly MapRegionArea[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
};

export type MapViewport = {
  bounds: LngLatBounds;
  zoom: number;
};

const FLY_DURATION_MS = 800;
const DEFAULT_BOUNDS_PADDING = 48;
const RAISED_MARKER_Z_INDEX = '2';

export type MapMarkerItem = {
  id: string;
  position: LngLat;
  node: ReactNode;
  anchor?: 'bottom' | 'center' | 'left';
  isRaised?: boolean;
};

type MapCanvasProps = {
  label: string;
  center: LngLat;
  zoom: number;
  bounds?: LngLatBounds | undefined;
  boundsPadding?: number;
  boundsRequestId?: number;
  focus?: MapFocus | undefined;
  markers: readonly MapMarkerItem[];
  overlays?: readonly MapOverlay[];
  imageOverlays?: readonly MapImageOverlay[];
  listingTiles?: MapListingTiles | undefined;
  regions?: MapRegions | undefined;
  onError: () => void;
  onPick?: (position: LngLat) => void;
  onViewportChange?: (viewport: MapViewport) => void;
  hidesPointsOfInterest?: boolean;
  isScrollZoomEnabled?: boolean;
  hasCooperativeGestures?: boolean;
  isPrintable?: boolean;
  hasNavigationControl?: boolean;
  basemap?: MapBasemap;
  isConfinedToBounds?: boolean;
  className?: string;
  ref?: Ref<MapCanvasController>;
};

type MapLabels = {
  zoomIn: string;
  zoomOut: string;
  title: string;
  toggleAttribution: string;
  mapFeedback: string;
  cooperativeDesktop: string;
  cooperativeMobile: string;
};

function labelElement(container: HTMLElement, selector: string, text: string) {
  const element = container.querySelector(selector);
  if (element) {
    element.setAttribute('title', text);
    element.setAttribute('aria-label', text);
  }
}

function setText(container: HTMLElement, selector: string, text: string) {
  const element = container.querySelector(selector);
  if (element) {
    element.textContent = text;
  }
}

function applyLabels(map: MapLibreMap, labels: MapLabels) {
  const container = map.getContainer();
  setText(container, '.maplibregl-desktop-message', labels.cooperativeDesktop);
  setText(container, '.maplibregl-mobile-message', labels.cooperativeMobile);
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
  boundsPadding = DEFAULT_BOUNDS_PADDING,
  boundsRequestId = 0,
  focus,
  markers,
  overlays = [],
  imageOverlays = [],
  listingTiles,
  regions,
  onError,
  onPick,
  onViewportChange,
  hidesPointsOfInterest = false,
  isScrollZoomEnabled = false,
  hasCooperativeGestures = false,
  isPrintable = false,
  hasNavigationControl = true,
  basemap = 'site',
  isConfinedToBounds = false,
  className,
  ref,
}: MapCanvasProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap>();
  const [isStyleReady, setIsStyleReady] = useState(false);
  const appliedOverlays = useRef(new Map<string, string>());
  const appliedImageOverlays = useRef(new Map<string, string>());
  const tileRequest = useRef<{ prefix: string; headers: Readonly<Record<string, string>> }>(
    undefined,
  );
  const initialView = useRef({
    center,
    zoom,
    isPrintable,
    hidesPointsOfInterest,
    isScrollZoomEnabled,
    hasCooperativeGestures,
    hasNavigationControl,
    basemap,
  });
  const labels: MapLabels = {
    zoomIn: t('map.zoomIn'),
    zoomOut: t('map.zoomOut'),
    title: t('map.title'),
    toggleAttribution: t('map.toggleAttribution'),
    mapFeedback: t('map.mapFeedback'),
    cooperativeDesktop: t('map.cooperativeDesktop'),
    cooperativeMobile: t('map.cooperativeMobile'),
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
        style: initialView.current.basemap === 'report' ? REPORT_MAP_STYLE_URL : MAP_STYLE_URL,
        center: initialView.current.center,
        zoom: initialView.current.zoom,
        attributionControl: false,
        scrollZoom: initialView.current.isScrollZoomEnabled,
        cooperativeGestures: initialView.current.hasCooperativeGestures,
        canvasContextAttributes: { preserveDrawingBuffer: initialView.current.isPrintable },
        transformRequest: (url, resourceType): RequestParameters => {
          const request = tileRequest.current;
          return String(resourceType) === 'Tile' && request && url.startsWith(request.prefix)
            ? { url, headers: { ...request.headers } }
            : { url };
        },
        locale: {
          'Map.Title': initialLabels.title,
          'NavigationControl.ZoomIn': initialLabels.zoomIn,
          'NavigationControl.ZoomOut': initialLabels.zoomOut,
          'AttributionControl.ToggleAttribution': initialLabels.toggleAttribution,
          'AttributionControl.MapFeedback': initialLabels.mapFeedback,
          'CooperativeGesturesHandler.WindowsHelpText': initialLabels.cooperativeDesktop,
          'CooperativeGesturesHandler.MacHelpText': initialLabels.cooperativeDesktop,
          'CooperativeGesturesHandler.MobileHelpText': initialLabels.cooperativeMobile,
        },
      });
    } catch {
      reportError();
      return;
    }
    const overlayRegistry = appliedOverlays.current;
    const imageRegistry = appliedImageOverlays.current;
    if (initialView.current.hasNavigationControl) {
      instance.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    }
    instance.addControl(new AttributionControl({ compact: true }), 'bottom-right');
    instance.on('style.load', () => {
      if (initialView.current.basemap === 'report') {
        applyReportBasemap(instance);
      } else {
        if (instance.getLayer('background')) {
          instance.setPaintProperty('background', 'background-color', themeColor('--background'));
        }
        if (instance.getLayer('water')) {
          instance.setPaintProperty('water', 'fill-color', themeColor('--map-water'));
        }
      }
      if (initialView.current.hidesPointsOfInterest) {
        for (const layer of instance.getStyle().layers) {
          if (layer.id.startsWith('poi')) {
            instance.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        }
      }
      overlayRegistry.clear();
      imageRegistry.clear();
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
      imageRegistry.clear();
      setMap(undefined);
      setIsStyleReady(false);
    };
  }, []);

  useEffect(() => {
    if (!map) {
      return;
    }
    if (hasCooperativeGestures) {
      map.cooperativeGestures.enable();
    } else {
      map.cooperativeGestures.disable();
    }
    applyLabels(map, {
      zoomIn: labels.zoomIn,
      zoomOut: labels.zoomOut,
      title: labels.title,
      toggleAttribution: labels.toggleAttribution,
      mapFeedback: labels.mapFeedback,
      cooperativeDesktop: labels.cooperativeDesktop,
      cooperativeMobile: labels.cooperativeMobile,
    });
  }, [
    map,
    hasCooperativeGestures,
    labels.zoomIn,
    labels.zoomOut,
    labels.title,
    labels.toggleAttribution,
    labels.mapFeedback,
    labels.cooperativeDesktop,
    labels.cooperativeMobile,
  ]);

  useEffect(() => {
    if (!map || !isStyleReady) {
      return;
    }
    syncOverlays(map, overlays, appliedOverlays.current);
  }, [map, isStyleReady, overlays]);

  useEffect(() => {
    if (!map || !isStyleReady) {
      return;
    }
    syncImageOverlays(map, imageOverlays, appliedImageOverlays.current);
  }, [map, isStyleReady, imageOverlays]);

  const fitToBounds = useEffectEvent((target: MapLibreMap) => {
    if (!bounds) {
      return;
    }
    if (isConfinedToBounds) {
      target.setMaxBounds(null);
      target.setMinZoom(null);
    }
    target.fitBounds(bounds, { padding: boundsPadding, maxZoom: 15, duration: 0 });
    if (isConfinedToBounds) {
      target.setMinZoom(target.getZoom());
      target.setMaxBounds(target.getBounds());
    }
  });
  const boundsKey = bounds ? bounds.flat().join(',') : '';
  useEffect(() => {
    if (map) {
      fitToBounds(map);
    }
  }, [map, boundsKey, boundsRequestId]);

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

  const tilesUrl = listingTiles?.url;
  const tilesHeaders = listingTiles?.headers;
  useEffect(() => {
    tileRequest.current =
      tilesUrl === undefined || tilesHeaders === undefined
        ? undefined
        : { prefix: tileRequestPrefix(tilesUrl), headers: tilesHeaders };
  }, [tilesUrl, tilesHeaders]);
  useMapListingTiles(map, isStyleReady, listingTiles);

  const moveToFocus = useEffectEvent((target: MapLibreMap) => {
    if (!focus) {
      return;
    }
    if (focus.zoom === undefined) {
      target.easeTo({ center: focus.position });
    } else {
      target.flyTo({ center: focus.position, zoom: focus.zoom, duration: FLY_DURATION_MS });
    }
  });
  const focusRequestId = focus?.requestId;
  useEffect(() => {
    if (map && focusRequestId !== undefined) {
      moveToFocus(map);
    }
  }, [map, focusRequestId]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        map?.zoomIn();
      },
      zoomOut: () => {
        map?.zoomOut();
      },
      fitBounds: (target) => {
        map?.fitBounds(target, { padding: 10, duration: FLY_DURATION_MS });
      },
    }),
    [map],
  );

  const regionTooltip = useMapRegions(map, isStyleReady, regions);

  return (
    <div
      role="region"
      aria-label={label}
      className={cn('relative isolate overflow-hidden rounded-xl bg-surface-alt', className)}
    >
      <div ref={containerRef} className="size-full" />
      {map
        ? markers.map((marker) => (
            <MapMarker
              key={marker.id}
              map={map}
              position={marker.position}
              anchor={marker.anchor ?? 'bottom'}
              isRaised={marker.isRaised ?? false}
            >
              {marker.node}
            </MapMarker>
          ))
        : null}
      {regionTooltip ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-card px-2.25 py-1.25 text-meta font-bold whitespace-nowrap text-foreground shadow-map-control"
          style={{ left: regionTooltip.x, top: regionTooltip.y - 12 }}
        >
          {regionTooltip.label}
        </span>
      ) : null}
    </div>
  );
}

function overlayLayerIds(id: string): string[] {
  return [id, `${id}-casing`];
}

function removeOverlay(map: MapLibreMap, id: string) {
  removeLayersAndSource(map, id, overlayLayerIds(id));
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

function firstLabelLayerId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id;
}

function syncImageOverlays(
  map: MapLibreMap,
  overlays: readonly MapImageOverlay[],
  registry: Map<string, string>,
) {
  const nextIds = new Set(overlays.map((overlay) => overlay.id));
  for (const id of registry.keys()) {
    if (!nextIds.has(id)) {
      removeLayersAndSource(map, id, [id]);
      registry.delete(id);
    }
  }
  for (const overlay of overlays) {
    const source = map.getSource(overlay.id);
    if (!source) {
      map.addSource(overlay.id, {
        type: 'image',
        url: overlay.url,
        coordinates: overlay.coordinates,
      });
      map.addLayer(
        {
          id: overlay.id,
          type: 'raster',
          source: overlay.id,
          paint: { 'raster-opacity': overlay.opacity, 'raster-fade-duration': 0 },
        },
        firstLabelLayerId(map),
      );
    } else if (registry.get(overlay.id) !== overlay.url && source instanceof ImageSource) {
      source.updateImage({ url: overlay.url, coordinates: overlay.coordinates });
    }
    registry.set(overlay.id, overlay.url);
    map.setLayoutProperty(overlay.id, 'visibility', overlay.isVisible ? 'visible' : 'none');
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
  isRaised: boolean;
  children: ReactNode;
};

function MapMarker({ map, position, anchor, isRaised, children }: MapMarkerProps) {
  const [element] = useState(() => document.createElement('div'));
  const [longitude, latitude] = position;

  useEffect(() => {
    const marker = new Marker({ element, anchor }).setLngLat([longitude, latitude]).addTo(map);
    marker.getElement().style.zIndex = isRaised ? RAISED_MARKER_Z_INDEX : '';
    return () => {
      marker.remove();
    };
  }, [map, element, anchor, longitude, latitude, isRaised]);

  return createPortal(children, element);
}
