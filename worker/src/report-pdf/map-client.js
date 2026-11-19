import { LngLatBounds, Map, Marker, setWorkerUrl } from './maplibre-gl.mjs';

setWorkerUrl(new URL('./maplibre-gl-worker.mjs', import.meta.url).href);

const TOLERATED_TILE_ERRORS = 4;
const { style, palette, maps } = JSON.parse(document.getElementById('map-specs').textContent);

function recolour(map) {
  for (const layer of map.getStyle().layers) {
    const rule = palette.find((entry) => entry.match.some((part) => layer.id.includes(part)));
    if (!rule) continue;
    if (rule.hide) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
      continue;
    }
    const property = rule.paint?.[layer.type];
    if (property) map.setPaintProperty(layer.id, property.name, property.value);
  }
}

function hideLabels(map) {
  for (const layer of map.getStyle().layers) {
    if (layer.type === 'symbol') map.setLayoutProperty(layer.id, 'visibility', 'none');
  }
}

function paint(layer) {
  const colour = layer.colorProperty
    ? ['coalesce', ['get', layer.colorProperty], layer.color]
    : layer.color;
  if (layer.kind === 'fill') {
    return {
      'fill-color': colour,
      'fill-opacity': layer.opacity ?? 0.4,
      ...(layer.outline ? { 'fill-outline-color': layer.outline } : {}),
    };
  }
  if (layer.kind === 'line') {
    return {
      'line-color': colour,
      'line-opacity': layer.opacity ?? 1,
      'line-width': layer.width ?? 2,
      ...(layer.dotted ? { 'line-dasharray': [0.01, 1.8] } : {}),
    };
  }
  return {
    'circle-color': colour,
    'circle-opacity': layer.opacity ?? 1,
    'circle-radius': layer.radius ?? 3,
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 1,
  };
}

function imageUrl(layer) {
  const canvas = document.createElement('canvas');
  canvas.width = layer.width;
  canvas.height = layer.height;
  const context = canvas.getContext('2d');
  context.putImageData(
    new ImageData(Uint8ClampedArray.from(layer.rgba), layer.width, layer.height),
    0,
    0,
  );
  return canvas.toDataURL('image/png');
}

function addImageLayer(map, id, layer) {
  const labels = map.getStyle().layers.find((entry) => entry.type === 'symbol');
  map.addSource(id, { type: 'image', url: imageUrl(layer), coordinates: layer.coordinates });
  map.addLayer(
    {
      id,
      type: 'raster',
      source: id,
      paint: { 'raster-resampling': 'linear', 'raster-fade-duration': 0 },
    },
    labels?.id,
  );
}

function markerElement(marker) {
  const element = document.createElement('div');
  element.className = 'mk';
  element.innerHTML = marker.html;
  return element;
}

function draw(spec) {
  return new Promise((resolve, reject) => {
    const map = new Map({
      container: spec.id,
      style,
      center: spec.center,
      zoom: spec.zoom ?? 14,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    let failedTiles = 0;
    map.on('error', (event) => {
      if (event.tile && (failedTiles += 1) <= TOLERATED_TILE_ERRORS) return;
      reject(event.error ?? new Error('The map could not be drawn'));
    });
    map.once('load', () => {
      recolour(map);
      if (spec.labels === false) hideLabels(map);
      if (spec.fit && spec.fit.length > 0) {
        const bounds = spec.fit.reduce(
          (box, position) => box.extend(position),
          new LngLatBounds(spec.fit[0], spec.fit[0]),
        );
        map.fitBounds(bounds, {
          padding: spec.padding ?? 36,
          animate: false,
          maxZoom: spec.maxZoom ?? 16,
        });
      }
      spec.layers.forEach((layer, index) => {
        const id = `overlay-${String(index)}`;
        if (layer.kind === 'image') {
          addImageLayer(map, id, layer);
          return;
        }
        map.addSource(id, { type: 'geojson', data: layer.data });
        map.addLayer({
          id,
          type: layer.kind,
          source: id,
          layout: layer.kind === 'line' ? { 'line-cap': 'round', 'line-join': 'round' } : {},
          paint: paint(layer),
        });
      });
      for (const marker of spec.markers) {
        new Marker({
          element: markerElement(marker),
          anchor: marker.anchor ?? 'center',
          offset: marker.offset ?? [0, 0],
        })
          .setLngLat(marker.position)
          .addTo(map);
      }
      map.once('idle', resolve);
    });
  });
}

globalThis.pdfReady = Promise.all(maps.map(draw));
