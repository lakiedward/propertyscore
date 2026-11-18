import {
  VectorTileSource,
  type ExpressionSpecification,
  type Map as MapLibreMap,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { LISTING_TILE_ZOOMS, type LngLat } from './map.config';
import { removeLayersAndSource } from './map-layers';
import {
  drawBubbleImage,
  drawPinImage,
  listingSymbolFonts,
  PIN_BOX_HEIGHT,
} from './map-listing-symbols';

const LISTING_SOURCE_ID = 'ps-listings';
export const LISTING_BUBBLE_LAYER_ID = 'ps-listings-bubbles';
const LISTING_PIN_LAYER_ID = 'ps-listings-pins';

const PIN_SOURCE_LAYER = 'listings';
const BUBBLE_SOURCE_LAYER = 'clusters';
const PIN_IMAGE_PREFIX = 'ps-pin|';
const BUBBLE_IMAGE_PREFIX = 'ps-bubble|';
const BUBBLE_ZOOM_STEP = 2;

export type MapTilePin = {
  id: string;
  position: LngLat;
  price: number;
  currency: string;
};

export type MapListingTiles = {
  url: string;
  headers: Readonly<Record<string, string>>;
  labelKey: string;
  priceStep: number;
  pinLabel: (price: number, currency: string) => string;
  bubbleLabel: (count: number) => string;
  hiddenIds: readonly string[];
  onPinHover: (pin: MapTilePin | undefined) => void;
  onPinSelect: (pin: MapTilePin) => void;
};

function pinImage(labelKey: string, priceStep: number): ExpressionSpecification {
  return [
    'concat',
    PIN_IMAGE_PREFIX,
    labelKey,
    '|',
    ['get', 'currency'],
    '|',
    ['to-string', ['*', ['round', ['/', ['get', 'price'], priceStep]], priceStep]],
  ];
}

function removeImagesOf(map: MapLibreMap, labelKey: string) {
  for (const prefix of [`${PIN_IMAGE_PREFIX}${labelKey}|`, `${BUBBLE_IMAGE_PREFIX}${labelKey}|`]) {
    for (const id of map.listImages()) {
      if (id.startsWith(prefix)) {
        map.removeImage(id);
      }
    }
  }
}

function bubbleImage(labelKey: string): ExpressionSpecification {
  return ['concat', BUBBLE_IMAGE_PREFIX, labelKey, '|', ['to-string', ['get', 'listing_count']]];
}

const HIDDEN_OPACITY: ExpressionSpecification = [
  'case',
  ['boolean', ['feature-state', 'hidden'], false],
  0,
  1,
];

function featurePosition(feature: MapGeoJSONFeature): LngLat | undefined {
  const geometry: unknown = feature.geometry;
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

function toPin(feature: MapGeoJSONFeature | undefined): MapTilePin | undefined {
  if (!feature) {
    return undefined;
  }
  const properties: Record<string, unknown> = feature.properties;
  const { id, price, currency } = properties;
  const position = featurePosition(feature);
  if (
    typeof id !== 'string' ||
    typeof price !== 'number' ||
    typeof currency !== 'string' ||
    !position
  ) {
    return undefined;
  }
  return { id, position, price, currency };
}

async function loadSymbolFonts() {
  if (typeof document.fonts === 'undefined') {
    return;
  }
  await Promise.all(listingSymbolFonts().map((font) => document.fonts.load(font))).catch(
    () => undefined,
  );
}

export function tileRequestPrefix(url: string): string {
  const query = url.indexOf('?');
  return query === -1 ? url : url.slice(0, query);
}

export function useMapListingTiles(
  map: MapLibreMap | undefined,
  isStyleReady: boolean,
  tiles: MapListingTiles | undefined,
) {
  const [isReady, setIsReady] = useState(false);
  const hasTiles = tiles !== undefined;
  const url = tiles?.url;
  const labelKey = tiles?.labelKey;
  const priceStep = tiles?.priceStep;
  const previousLabelKey = useRef<string>(undefined);
  const hiddenKey = tiles ? tiles.hiddenIds.join('|') : '';

  const readTiles = useEffectEvent(() => tiles);

  const drawMissingImage = useEffectEvent((target: MapLibreMap, id: string) => {
    const current = tiles;
    if (!current) {
      return;
    }
    const pixelRatio = window.devicePixelRatio || 1;
    const parts = id.split('|');
    if (id.startsWith(PIN_IMAGE_PREFIX)) {
      const [, , currency = '', price = ''] = parts;
      const image = drawPinImage(current.pinLabel(Number(price), currency), pixelRatio);
      if (image) {
        target.addImage(id, image, { pixelRatio: image.pixelRatio });
      }
      return;
    }
    if (id.startsWith(BUBBLE_IMAGE_PREFIX)) {
      const count = Number(parts[2]);
      const image = drawBubbleImage(current.bubbleLabel(count), count, pixelRatio);
      if (image) {
        target.addImage(id, image, { pixelRatio: image.pixelRatio });
      }
    }
  });

  useEffect(() => {
    if (!map || !isStyleReady || !hasTiles) {
      return;
    }
    let isCancelled = false;
    let isRemoved = false;
    const handleRemove = () => {
      isRemoved = true;
    };
    map.on('remove', handleRemove);
    void loadSymbolFonts().then(() => {
      const initial = readTiles();
      if (isCancelled || !initial || map.getSource(LISTING_SOURCE_ID)) {
        return;
      }
      map.setMissingStyleImageResolver((id) => {
        drawMissingImage(map, id);
      });
      map.addSource(LISTING_SOURCE_ID, {
        type: 'vector',
        tiles: [initial.url],
        minzoom: LISTING_TILE_ZOOMS.min,
        maxzoom: LISTING_TILE_ZOOMS.max,
        promoteId: { [PIN_SOURCE_LAYER]: 'id' },
      });
      map.addLayer({
        id: LISTING_BUBBLE_LAYER_ID,
        type: 'symbol',
        source: LISTING_SOURCE_ID,
        'source-layer': BUBBLE_SOURCE_LAYER,
        layout: {
          'icon-image': bubbleImage(initial.labelKey),
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });
      map.addLayer({
        id: LISTING_PIN_LAYER_ID,
        type: 'symbol',
        source: LISTING_SOURCE_ID,
        'source-layer': PIN_SOURCE_LAYER,
        layout: {
          'icon-image': pinImage(initial.labelKey, initial.priceStep),
          'icon-offset': [0, -PIN_BOX_HEIGHT / 2],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'symbol-sort-key': ['-', 0, ['get', 'price']],
        },
        paint: { 'icon-opacity': HIDDEN_OPACITY },
      });
      setIsReady(true);
    });
    return () => {
      isCancelled = true;
      map.off('remove', handleRemove);
      if (!isRemoved) {
        map.setMissingStyleImageResolver(null);
        removeLayersAndSource(map, LISTING_SOURCE_ID, [
          LISTING_PIN_LAYER_ID,
          LISTING_BUBBLE_LAYER_ID,
        ]);
      }
      setIsReady(false);
    };
  }, [map, isStyleReady, hasTiles]);

  useEffect(() => {
    if (!map || !isReady || url === undefined) {
      return;
    }
    const source = map.getSource(LISTING_SOURCE_ID);
    if (source instanceof VectorTileSource) {
      source.setTiles([url]);
    }
  }, [map, isReady, url]);

  useEffect(() => {
    if (!map || !isReady || labelKey === undefined || priceStep === undefined) {
      return;
    }
    map.setLayoutProperty(LISTING_PIN_LAYER_ID, 'icon-image', pinImage(labelKey, priceStep));
    map.setLayoutProperty(LISTING_BUBBLE_LAYER_ID, 'icon-image', bubbleImage(labelKey));
    const previous = previousLabelKey.current;
    if (previous !== undefined && previous !== labelKey) {
      removeImagesOf(map, previous);
    }
    previousLabelKey.current = labelKey;
  }, [map, isReady, labelKey, priceStep]);

  useEffect(() => {
    if (!map || !isReady || hiddenKey === '') {
      return;
    }
    const ids = hiddenKey.split('|');
    for (const id of ids) {
      map.setFeatureState(
        { source: LISTING_SOURCE_ID, sourceLayer: PIN_SOURCE_LAYER, id },
        { hidden: true },
      );
    }
    return () => {
      if (!map.getSource(LISTING_SOURCE_ID)) {
        return;
      }
      for (const id of ids) {
        map.setFeatureState(
          { source: LISTING_SOURCE_ID, sourceLayer: PIN_SOURCE_LAYER, id },
          { hidden: false },
        );
      }
    };
  }, [map, isReady, hiddenKey]);

  const hoverPin = useEffectEvent((pin: MapTilePin | undefined) => {
    tiles?.onPinHover(pin);
  });
  const selectPin = useEffectEvent((pin: MapTilePin) => {
    tiles?.onPinSelect(pin);
  });

  useEffect(() => {
    if (!map || !isReady) {
      return;
    }
    const canvas = map.getCanvas();
    let hoveredId: string | undefined;
    const handlePinMove = (event: MapLayerMouseEvent) => {
      const pin = toPin(event.features?.[0]);
      canvas.style.cursor = 'pointer';
      if (pin && pin.id !== hoveredId) {
        hoveredId = pin.id;
        hoverPin(pin);
      }
    };
    const handlePinLeave = () => {
      canvas.style.cursor = '';
      hoveredId = undefined;
      hoverPin(undefined);
    };
    const handlePinClick = (event: MapLayerMouseEvent) => {
      const pin = toPin(event.features?.[0]);
      if (pin) {
        selectPin(pin);
      }
    };
    const handleBubbleEnter = () => {
      canvas.style.cursor = 'pointer';
    };
    const handleBubbleLeave = () => {
      canvas.style.cursor = '';
    };
    const handleBubbleClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const position = feature ? featurePosition(feature) : undefined;
      if (position) {
        map.easeTo({ center: position, zoom: map.getZoom() + BUBBLE_ZOOM_STEP });
      }
    };
    map.on('mousemove', LISTING_PIN_LAYER_ID, handlePinMove);
    map.on('mouseleave', LISTING_PIN_LAYER_ID, handlePinLeave);
    map.on('click', LISTING_PIN_LAYER_ID, handlePinClick);
    map.on('mouseenter', LISTING_BUBBLE_LAYER_ID, handleBubbleEnter);
    map.on('mouseleave', LISTING_BUBBLE_LAYER_ID, handleBubbleLeave);
    map.on('click', LISTING_BUBBLE_LAYER_ID, handleBubbleClick);
    return () => {
      map.off('mousemove', LISTING_PIN_LAYER_ID, handlePinMove);
      map.off('mouseleave', LISTING_PIN_LAYER_ID, handlePinLeave);
      map.off('click', LISTING_PIN_LAYER_ID, handlePinClick);
      map.off('mouseenter', LISTING_BUBBLE_LAYER_ID, handleBubbleEnter);
      map.off('mouseleave', LISTING_BUBBLE_LAYER_ID, handleBubbleLeave);
      map.off('click', LISTING_BUBBLE_LAYER_ID, handleBubbleClick);
    };
  }, [map, isReady]);
}
