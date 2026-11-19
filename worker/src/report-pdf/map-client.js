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

const HEAT_PIXELS_PER_CELL = 10;
const HEAT_OUTSIDE_DB = 30;
const METRES_PER_DEGREE = 111320;

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function stopColour(stops, level) {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (level <= first[0]) return hexToRgb(first[1]);
  if (level >= last[0]) return hexToRgb(last[1]);
  const upper = stops.findIndex((stop) => level <= stop[0]);
  const low = stops[upper - 1];
  const high = stops[upper];
  const share = (level - low[0]) / (high[0] - low[0]);
  const from = hexToRgb(low[1]);
  const to = hexToRgb(high[1]);
  return from.map((channel, index) => channel + (to[index] - channel) * share);
}

function eased(share) {
  return (1 - Math.cos(share * Math.PI)) / 2;
}

const HEAT_BLUR_PASSES = 2;
const HEAT_KERNEL = [
  [1, 2, 1],
  [2, 4, 2],
  [1, 2, 1],
];

function blurred(levels, width) {
  let current = levels.map((value) => value ?? HEAT_OUTSIDE_DB);
  for (let pass = 0; pass < HEAT_BLUR_PASSES; pass += 1) {
    const source = current;
    current = source.map((own, index) => {
      const row = Math.floor(index / width);
      const column = index % width;
      let sum = 0;
      let weight = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const neighbour = source[(row + dy) * width + column + dx];
          const factor = HEAT_KERNEL[dy + 1][dx + 1];
          const inside =
            row + dy >= 0 && row + dy < width && column + dx >= 0 && column + dx < width;
          sum += (inside ? neighbour : own) * factor;
          weight += factor;
        }
      }
      return sum / weight;
    });
  }
  return current;
}

function heatCanvas(layer) {
  const { half } = layer.grid;
  const width = 2 * half + 1;
  const levels = blurred(layer.grid.levels, width);
  const side = width * HEAT_PIXELS_PER_CELL;
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext('2d');
  const image = context.createImageData(side, side);
  const level = (row, column) => levels[row * width + column];
  for (let y = 0; y < side; y += 1) {
    const v = Math.min(Math.max((y + 0.5) / HEAT_PIXELS_PER_CELL - 0.5, 0), width - 1);
    const row = Math.min(Math.floor(v), width - 2);
    const rowShare = eased(v - row);
    for (let x = 0; x < side; x += 1) {
      const u = Math.min(Math.max((x + 0.5) / HEAT_PIXELS_PER_CELL - 0.5, 0), width - 1);
      const column = Math.min(Math.floor(u), width - 2);
      const columnShare = eased(u - column);
      const top = level(row, column) * (1 - columnShare) + level(row, column + 1) * columnShare;
      const bottom =
        level(row + 1, column) * (1 - columnShare) + level(row + 1, column + 1) * columnShare;
      const value = top * (1 - rowShare) + bottom * rowShare;
      const fade = Math.min(
        Math.max((value - layer.fadeFromDb) / (layer.fadeToDb - layer.fadeFromDb), 0),
        1,
      );
      const [red, green, blue] = stopColour(layer.stops, value);
      const offset = (y * side + x) * 4;
      image.data[offset] = red;
      image.data[offset + 1] = green;
      image.data[offset + 2] = blue;
      image.data[offset + 3] = Math.round(255 * layer.opacity * eased(fade));
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function addHeat(map, layer, id) {
  const { center, step_m: step, half } = layer.grid;
  const reach = (half + 0.5) * step;
  const north = reach / METRES_PER_DEGREE;
  const east = reach / (METRES_PER_DEGREE * Math.cos((center[1] * Math.PI) / 180));
  map.addSource(id, {
    type: 'image',
    url: heatCanvas(layer).toDataURL('image/png'),
    coordinates: [
      [center[0] - east, center[1] + north],
      [center[0] + east, center[1] + north],
      [center[0] + east, center[1] - north],
      [center[0] - east, center[1] - north],
    ],
  });
  map.addLayer({
    id,
    type: 'raster',
    source: id,
    paint: { 'raster-opacity': 1, 'raster-resampling': 'linear', 'raster-fade-duration': 0 },
  });
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
        if (layer.kind === 'heat') {
          addHeat(map, layer, id);
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
