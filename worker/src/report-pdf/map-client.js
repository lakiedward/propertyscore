import { LngLatBounds, Map, Marker, setWorkerUrl } from './maplibre-gl.mjs';

setWorkerUrl(new URL('./maplibre-gl-worker.mjs', import.meta.url).href);

const { style, maps } = JSON.parse(document.getElementById('map-specs').textContent);

function paint(layer) {
  if (layer.kind === 'fill') {
    return { 'fill-color': layer.color, 'fill-opacity': layer.opacity ?? 0.4 };
  }
  if (layer.kind === 'line') {
    return {
      'line-color': layer.color,
      'line-opacity': layer.opacity ?? 1,
      'line-width': layer.width ?? 2,
      ...(layer.dashed ? { 'line-dasharray': [2, 2] } : {}),
    };
  }
  return {
    'circle-color': layer.color,
    'circle-opacity': layer.opacity ?? 1,
    'circle-radius': layer.radius ?? 3,
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 1,
  };
}

function markerElement(marker) {
  const element = document.createElement('div');
  if (marker.label === undefined) {
    element.className = 'pin';
    return element;
  }
  element.className = 'marker';
  element.textContent = marker.label;
  if (marker.color) element.style.setProperty('--marker', marker.color);
  return element;
}

function draw(spec) {
  return new Promise((resolve) => {
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
    map.once('load', () => {
      if (spec.fit && spec.fit.length > 0) {
        const bounds = spec.fit.reduce(
          (box, position) => box.extend(position),
          new LngLatBounds(spec.center, spec.center),
        );
        map.fitBounds(bounds, { padding: 28, animate: false, maxZoom: 16 });
      }
      spec.layers.forEach((layer, index) => {
        const id = `overlay-${String(index)}`;
        map.addSource(id, { type: 'geojson', data: layer.data });
        map.addLayer({ id, type: layer.kind, source: id, paint: paint(layer) });
      });
      for (const marker of spec.markers) {
        new Marker({ element: markerElement(marker) }).setLngLat(marker.position).addTo(map);
      }
      map.once('idle', resolve);
    });
  });
}

globalThis.pdfReady = Promise.all(maps.map(draw));
