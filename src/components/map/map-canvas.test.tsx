import { act, screen } from '@testing-library/react';
import { useState } from 'react';
import { changeLocale } from '@/i18n/i18n';
import enCommon from '@/i18n/locales/en/common.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { MapCanvas, type MapOverlay } from './map-canvas';
import type { LngLatBounds } from './map.config';

const maplibre = vi.hoisted(() => {
  const control = { shouldThrow: false };

  class FakeGeoJSONSource {
    setData = vi.fn(() => Promise.resolve());
  }

  class FakeNavigationControl {
    readonly position = 'top-right';
  }

  class FakeAttributionControl {
    readonly position = 'bottom-right';
  }

  type FakeMapOptions = {
    container: HTMLElement;
    locale: Record<string, string>;
  };

  class FakeMap {
    static instances: FakeMap[] = [];
    readonly options: FakeMapOptions;
    readonly canvas = document.createElement('canvas');
    readonly handlers = new Map<string, (event?: unknown) => void>();
    readonly sources = new Map<string, FakeGeoJSONSource>();
    readonly layers = new Set<string>();
    setPaintProperty = vi.fn();
    setLayoutProperty = vi.fn();
    fitBounds = vi.fn();
    easeTo = vi.fn();
    resize = vi.fn();
    remove = vi.fn();

    constructor(options: FakeMapOptions) {
      if (control.shouldThrow) {
        throw new Error('WebGL is not supported');
      }
      this.options = options;
      this.canvas.setAttribute('aria-label', options.locale['Map.Title'] ?? '');
      options.container.append(this.canvas);
      FakeMap.instances.push(this);
    }

    addControl(added: unknown) {
      const container = this.options.container;
      if (added instanceof FakeNavigationControl) {
        for (const [className, key] of [
          ['maplibregl-ctrl-zoom-in', 'NavigationControl.ZoomIn'],
          ['maplibregl-ctrl-zoom-out', 'NavigationControl.ZoomOut'],
        ] as const) {
          const button = document.createElement('button');
          button.className = className;
          button.setAttribute('aria-label', this.options.locale[key] ?? '');
          container.append(button);
        }
      }
      if (added instanceof FakeAttributionControl) {
        const toggle = document.createElement('summary');
        toggle.className = 'maplibregl-ctrl-attrib-button';
        toggle.setAttribute(
          'aria-label',
          this.options.locale['AttributionControl.ToggleAttribution'] ?? '',
        );
        container.append(toggle);
      }
      return this;
    }

    on(event: string, handler: (event?: unknown) => void) {
      this.handlers.set(event, handler);
      return this;
    }

    off(event: string) {
      this.handlers.delete(event);
      return this;
    }

    emit(event: string, payload?: unknown) {
      this.handlers.get(event)?.(payload);
    }

    isStyleLoaded() {
      return false;
    }

    getContainer() {
      return this.options.container;
    }

    getCanvas() {
      return this.canvas;
    }

    getLayer(id: string) {
      return this.layers.has(id) ? { id } : undefined;
    }

    addLayer(layer: { id: string }) {
      this.layers.add(layer.id);
    }

    removeLayer(id: string) {
      this.layers.delete(id);
    }

    getSource(id: string) {
      return this.sources.get(id);
    }

    addSource(id: string) {
      this.sources.set(id, new FakeGeoJSONSource());
    }

    removeSource(id: string) {
      this.sources.delete(id);
    }
  }

  class FakeMarker {
    setLngLat() {
      return this;
    }

    addTo() {
      return this;
    }

    remove() {
      return this;
    }
  }

  return {
    control,
    FakeMap,
    module: {
      Map: FakeMap,
      Marker: FakeMarker,
      NavigationControl: FakeNavigationControl,
      AttributionControl: FakeAttributionControl,
      GeoJSONSource: FakeGeoJSONSource,
      setWorkerUrl: vi.fn(),
    },
  };
});

vi.mock('maplibre-gl', () => maplibre.module);
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: 'worker.js' }));

const LABEL = 'Harta proprietăților';
const CENTER: [number, number] = [21.23, 45.75];
const FIRST_BOUNDS: LngLatBounds = [
  [21.2, 45.7],
  [21.3, 45.8],
];
const SECOND_BOUNDS: LngLatBounds = [
  [21.1, 45.6],
  [21.4, 45.9],
];

function routeOverlay(isVisible: boolean, coordinates: [number, number][]): MapOverlay {
  return {
    id: 'walk-school',
    kind: 'line',
    data: {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } },
      ],
    },
    colorToken: '--category-education',
    width: 4,
    hasCasing: true,
    isVisible,
  };
}

function lastMap() {
  const map = maplibre.FakeMap.instances.at(-1);
  if (!map) {
    throw new Error('No map was created');
  }
  return map;
}

function MapHarness() {
  const [step, setStep] = useState(0);
  const overlays =
    step === 0
      ? [routeOverlay(true, [CENTER, [21.24, 45.76]])]
      : step === 1
        ? [routeOverlay(false, [CENTER, [21.25, 45.77]])]
        : [];
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStep((current) => current + 1);
        }}
      >
        next
      </button>
      <MapCanvas
        label={LABEL}
        center={CENTER}
        zoom={14}
        bounds={step === 0 ? FIRST_BOUNDS : SECOND_BOUNDS}
        focus={step === 0 ? undefined : { position: CENTER, requestId: step }}
        markers={[]}
        overlays={overlays}
        onError={vi.fn()}
      />
    </>
  );
}

describe('MapCanvas', () => {
  afterEach(() => {
    maplibre.control.shouldThrow = false;
    maplibre.FakeMap.instances = [];
  });

  it('reports an error when the map cannot be created', async () => {
    maplibre.control.shouldThrow = true;
    const onError = vi.fn();

    await renderWithProviders(
      <MapCanvas label={LABEL} center={CENTER} zoom={14} markers={[]} onError={onError} />,
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(screen.getByRole('region', { name: LABEL })).toBeInTheDocument();
  });

  it('reports the clicked position when it lets people pick a place', async () => {
    const onPick = vi.fn();
    await renderWithProviders(
      <MapCanvas
        label={LABEL}
        center={CENTER}
        zoom={14}
        markers={[]}
        onError={vi.fn()}
        onPick={onPick}
      />,
    );

    act(() => {
      lastMap().emit('click', { lngLat: { lng: 21.23, lat: 45.75 } });
    });

    expect(onPick).toHaveBeenCalledWith([21.23, 45.75]);
  });

  it('removes the map when it unmounts', async () => {
    const { unmount } = await renderWithProviders(
      <MapCanvas label={LABEL} center={CENTER} zoom={14} markers={[]} onError={vi.fn()} />,
    );
    const map = lastMap();

    unmount();

    expect(map.remove).toHaveBeenCalledOnce();
  });

  it('relabels its controls without creating a new map when the language changes', async () => {
    await renderWithProviders(
      <MapCanvas label={LABEL} center={CENTER} zoom={14} markers={[]} onError={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: roCommon.map.zoomIn })).toBeInTheDocument();

    await act(async () => {
      await changeLocale('en');
    });

    expect(maplibre.FakeMap.instances).toHaveLength(1);
    expect(screen.getByRole('button', { name: enCommon.map.zoomIn })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: enCommon.map.zoomOut })).toBeInTheDocument();
    expect(lastMap().canvas).toHaveAttribute('aria-label', enCommon.map.title);
  });

  it('keeps overlays, bounds and focus in sync with its props', async () => {
    const { user } = await renderWithProviders(<MapHarness />);
    const map = lastMap();
    expect(map.fitBounds).toHaveBeenLastCalledWith(FIRST_BOUNDS, expect.anything());

    act(() => {
      map.emit('style.load');
    });
    expect(map.layers).toEqual(new Set(['walk-school-casing', 'walk-school']));
    expect(map.setLayoutProperty).toHaveBeenLastCalledWith(
      'walk-school-casing',
      'visibility',
      'visible',
    );

    await user.click(screen.getByRole('button', { name: 'next' }));
    expect(map.setLayoutProperty).toHaveBeenLastCalledWith(
      'walk-school-casing',
      'visibility',
      'none',
    );
    expect(map.sources.get('walk-school')?.setData).toHaveBeenCalledOnce();
    expect(map.fitBounds).toHaveBeenLastCalledWith(SECOND_BOUNDS, expect.anything());
    expect(map.easeTo).toHaveBeenCalledWith({ center: CENTER });

    await user.click(screen.getByRole('button', { name: 'next' }));
    expect(map.easeTo).toHaveBeenCalledTimes(2);
    expect(map.layers.size).toBe(0);
    expect(map.sources.size).toBe(0);
  });

  it('draws filled areas with an outline', async () => {
    const area: MapOverlay = {
      id: 'green-areas',
      kind: 'fill',
      colorToken: '--category-green-fill',
      opacity: 0.4,
      outlineWidth: 1,
      isVisible: true,
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { id: 'park' },
            geometry: {
              type: 'Polygon',
              coordinates: [[CENTER, [21.24, 45.75], [21.24, 45.76], CENTER]],
            },
          },
        ],
      },
    };
    await renderWithProviders(
      <MapCanvas
        label={LABEL}
        center={CENTER}
        zoom={14}
        markers={[]}
        overlays={[area]}
        onError={vi.fn()}
      />,
    );
    const map = lastMap();

    act(() => {
      map.emit('style.load');
    });

    expect(map.layers).toEqual(new Set(['green-areas', 'green-areas-casing']));
  });
});
