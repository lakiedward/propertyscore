import { act, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { changeLocale } from '@/i18n/i18n';
import enCommon from '@/i18n/locales/en/common.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import {
  MapCanvas,
  type MapCanvasController,
  type MapFocus,
  type MapOverlay,
  type MapRegions,
} from './map-canvas';
import type { LngLatBounds } from './map.config';

const maplibre = vi.hoisted(() => {
  const control = { shouldThrow: false };

  class FakeGeoJSONSource {
    setData = vi.fn(() => Promise.resolve());
  }

  class FakeVectorTileSource {
    setTiles = vi.fn();
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
    cooperativeGestures?: boolean;
    transformRequest: (url: string, resourceType: string) => { url: string; headers?: object };
  };

  class FakeMap {
    static instances: FakeMap[] = [];
    readonly options: FakeMapOptions;
    readonly canvas = document.createElement('canvas');
    readonly handlers = new Map<string, Set<(event?: unknown) => void>>();
    styleLayers: { id: string }[] = [];
    zoom = 14;
    readonly sources = new Map<string, FakeGeoJSONSource | FakeVectorTileSource>();
    readonly layers = new Set<string>();
    setPaintProperty = vi.fn();
    setLayoutProperty = vi.fn();
    setFilter = vi.fn();
    setFeatureState = vi.fn();
    addImage = vi.fn();
    missingImageResolver: ((id: string) => void) | null = null;

    setMissingStyleImageResolver(resolver: ((id: string) => void) | null) {
      this.missingImageResolver = resolver;
      return this;
    }
    fitBounds = vi.fn();
    setMaxBounds = vi.fn();
    setMinZoom = vi.fn();
    easeTo = vi.fn();
    flyTo = vi.fn();
    zoomIn = vi.fn();
    zoomOut = vi.fn();
    readonly addedLayers: { id: string; type?: string; filter?: unknown }[] = [];
    resize = vi.fn();
    remove = vi.fn();
    readonly cooperativeGestures = { enable: vi.fn(), disable: vi.fn() };

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

    on(
      event: string,
      layerOrHandler: string | ((event?: unknown) => void),
      layerHandler?: (event?: unknown) => void,
    ) {
      const key = typeof layerOrHandler === 'string' ? `${event}:${layerOrHandler}` : event;
      const handler = typeof layerOrHandler === 'string' ? layerHandler : layerOrHandler;
      if (!handler) {
        return this;
      }
      const handlers = this.handlers.get(key) ?? new Set();
      handlers.add(handler);
      this.handlers.set(key, handlers);
      return this;
    }

    off(
      event: string,
      layerOrHandler?: string | ((event?: unknown) => void),
      layerHandler?: (event?: unknown) => void,
    ) {
      const key = typeof layerOrHandler === 'string' ? `${event}:${layerOrHandler}` : event;
      const handler = typeof layerOrHandler === 'string' ? layerHandler : layerOrHandler;
      if (handler) {
        this.handlers.get(key)?.delete(handler);
      } else {
        this.handlers.delete(key);
      }
      return this;
    }

    emit(event: string, payload?: unknown) {
      for (const handler of this.handlers.get(event) ?? []) {
        handler(payload);
      }
    }

    getStyle() {
      return { layers: this.styleLayers };
    }

    getBounds() {
      return {
        getWest: () => 21.1,
        getSouth: () => 45.7,
        getEast: () => 21.4,
        getNorth: () => 45.8,
        contains: ([longitude, latitude]: [number, number]) =>
          longitude >= 21.1 && longitude <= 21.4 && latitude >= 45.7 && latitude <= 45.8,
      };
    }

    getZoom() {
      return this.zoom;
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

    addLayer(layer: { id: string; type?: string; filter?: unknown }) {
      this.layers.add(layer.id);
      this.addedLayers.push(layer);
    }

    removeLayer(id: string) {
      this.layers.delete(id);
    }

    getSource(id: string) {
      return this.sources.get(id);
    }

    addSource(id: string, spec: { type: string }) {
      this.sources.set(
        id,
        spec.type === 'vector' ? new FakeVectorTileSource() : new FakeGeoJSONSource(),
      );
    }

    removeSource(id: string) {
      this.sources.delete(id);
    }
  }

  class FakeMarker {
    readonly element: HTMLElement;

    constructor(options: { element: HTMLElement }) {
      this.element = options.element;
    }

    setLngLat() {
      return this;
    }

    getElement() {
      return this.element;
    }

    addTo(map: FakeMap) {
      map.getContainer().append(this.element);
      return this;
    }

    remove() {
      this.element.remove();
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
      VectorTileSource: FakeVectorTileSource,
      setWorkerUrl: vi.fn(),
      prewarm: vi.fn(),
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

function MapHarness({ refitsBoundsOnResize = false }: { refitsBoundsOnResize?: boolean }) {
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
        refitsBoundsOnResize={refitsBoundsOnResize}
        isConfinedToBounds={refitsBoundsOnResize}
        focus={step === 0 ? undefined : { position: CENTER, requestId: step }}
        markers={[]}
        overlays={overlays}
        onError={vi.fn()}
      />
    </>
  );
}

function CooperativeHarness() {
  const [isCooperative, setIsCooperative] = useState(true);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsCooperative(false);
        }}
      >
        free
      </button>
      <MapCanvas
        label={LABEL}
        center={CENTER}
        zoom={14}
        markers={[]}
        isScrollZoomEnabled
        hasCooperativeGestures={isCooperative}
        onError={vi.fn()}
      />
    </>
  );
}

const TILES_URL = 'https://db.example/rest/v1/rpc/listing_map_tile?p_transaction=sale';

type TilesHarnessProps = {
  onPinHover: (pin: unknown) => void;
  onPinSelect: (pin: unknown) => void;
  pinLabel: (price: number, currency: string) => string;
};

function TilesHarness({ onPinHover, onPinSelect, pinLabel }: TilesHarnessProps) {
  const [isFiltered, setIsFiltered] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsFiltered(true);
        }}
      >
        next
      </button>
      <MapCanvas
        label={LABEL}
        center={CENTER}
        zoom={14}
        markers={[]}
        onError={vi.fn()}
        listingTiles={{
          url: isFiltered ? `${TILES_URL}&p_max_price_eur=100000` : TILES_URL,
          headers: { apikey: 'key' },
          labelKey: 'ro-sale',
          priceStep: 1000,
          pinLabel,
          bubbleLabel: String,
          hiddenIds: isFiltered ? ['a'] : [],
          onPinHover,
          onPinSelect,
        }}
      />
    </>
  );
}

describe('MapCanvas', () => {
  afterEach(() => {
    maplibre.control.shouldThrow = false;
    maplibre.FakeMap.instances = [];
    vi.restoreAllMocks();
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

  it('lets the page scroll over the map until cooperative gestures are turned off', async () => {
    const { user } = await renderWithProviders(<CooperativeHarness />);
    const map = lastMap();

    expect(map.options.cooperativeGestures).toBe(true);
    expect(map.options.locale['CooperativeGesturesHandler.WindowsHelpText']).toBe(
      roCommon.map.cooperativeDesktop,
    );
    expect(map.options.locale['CooperativeGesturesHandler.MobileHelpText']).toBe(
      roCommon.map.cooperativeMobile,
    );
    expect(map.cooperativeGestures.enable).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'free' }));

    expect(map.cooperativeGestures.disable).toHaveBeenCalledOnce();
    expect(maplibre.FakeMap.instances).toHaveLength(1);
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
    const routeSource = map.sources.get('walk-school');
    expect(
      routeSource && 'setData' in routeSource ? routeSource.setData : undefined,
    ).toHaveBeenCalledOnce();
    expect(map.fitBounds).toHaveBeenLastCalledWith(SECOND_BOUNDS, expect.anything());
    expect(map.easeTo).toHaveBeenCalledWith({ center: CENTER });

    await user.click(screen.getByRole('button', { name: 'next' }));
    expect(map.easeTo).toHaveBeenCalledTimes(2);
    expect(map.layers.size).toBe(0);
    expect(map.sources.size).toBe(0);
  });

  it('refits the active bounds after resizing a confined route map without remounting', async () => {
    let notifyResize: (() => void) | undefined;
    vi.spyOn(globalThis, 'ResizeObserver').mockImplementation(
      class {
        constructor(callback: ResizeObserverCallback) {
          notifyResize = () => {
            callback([], this);
          };
        }
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
    const { user } = await renderWithProviders(<MapHarness refitsBoundsOnResize />);
    const map = lastMap();
    const viewportBounds = map.getBounds();
    vi.spyOn(map, 'getBounds').mockReturnValue(viewportBounds);
    let width = 375;
    let height = 520;
    Object.defineProperties(map.options.container, {
      clientWidth: { get: () => width },
      clientHeight: { get: () => height },
    });
    act(() => notifyResize?.());
    expect(map.fitBounds).toHaveBeenLastCalledWith(FIRST_BOUNDS, expect.anything());
    await user.click(screen.getByRole('button', { name: 'next' }));
    map.fitBounds.mockClear();
    map.resize.mockClear();
    map.setMaxBounds.mockClear();
    map.setMinZoom.mockClear();

    width = 900;
    height = 560;
    act(() => notifyResize?.());

    expect(map.resize).toHaveBeenCalledBefore(map.fitBounds);
    expect(map.fitBounds).toHaveBeenCalledExactlyOnceWith(SECOND_BOUNDS, {
      padding: 48,
      maxZoom: 15,
      duration: 0,
    });
    expect(map.setMaxBounds).toHaveBeenNthCalledWith(1, null);
    expect(map.setMinZoom).toHaveBeenNthCalledWith(1, null);
    expect(map.setMaxBounds).toHaveBeenLastCalledWith(viewportBounds);
    expect(maplibre.FakeMap.instances).toHaveLength(1);

    act(() => notifyResize?.());
    expect(map.fitBounds).toHaveBeenCalledOnce();
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

  it('hides the point-of-interest icons and reports where the map stopped', async () => {
    const onViewportChange = vi.fn();
    await renderWithProviders(
      <MapCanvas
        label={LABEL}
        center={CENTER}
        zoom={14}
        markers={[]}
        onError={vi.fn()}
        onViewportChange={onViewportChange}
        hidesPointsOfInterest
      />,
    );
    const map = lastMap();
    map.styleLayers = [{ id: 'poi_r1' }, { id: 'road_primary' }];

    act(() => {
      map.emit('style.load');
    });

    expect(map.setLayoutProperty).toHaveBeenCalledWith('poi_r1', 'visibility', 'none');
    expect(map.setLayoutProperty).not.toHaveBeenCalledWith('road_primary', 'visibility', 'none');
    expect(onViewportChange).toHaveBeenLastCalledWith({
      bounds: [
        [21.1, 45.7],
        [21.4, 45.8],
      ],
      zoom: 14,
    });

    map.zoom = 16;
    act(() => {
      map.emit('moveend');
    });

    expect(onViewportChange).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: 16 }));
  });

  it('draws the listing tiles, follows the filters, hides the highlighted pin and reports picks', async () => {
    const canvasContext = {
      scale: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 48 })),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      canvas: { width: 1, height: 1 },
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      // @ts-expect-error jsdom has no 2D canvas, so the test hands the map a partial context
      () => canvasContext,
    );
    const onPinHover = vi.fn();
    const onPinSelect = vi.fn();
    const pinLabel = vi.fn((price: number) => `${String(price / 1000)}k €`);
    const { user } = await renderWithProviders(
      <TilesHarness onPinHover={onPinHover} onPinSelect={onPinSelect} pinLabel={pinLabel} />,
    );
    const map = lastMap();
    act(() => {
      map.emit('style.load');
    });

    await vi.waitFor(() => {
      expect(map.getSource('ps-listings')).toBeDefined();
    });
    expect(map.addedLayers.map((layer) => layer.id)).toEqual(
      expect.arrayContaining(['ps-listings-bubbles', 'ps-listings-pins']),
    );
    expect(map.options.transformRequest(`${TILES_URL}&p_z=6`, 'Tile')).toEqual({
      url: `${TILES_URL}&p_z=6`,
      headers: { apikey: 'key' },
    });
    expect(map.options.transformRequest('https://tiles.example/1.pbf', 'Tile')).toEqual({
      url: 'https://tiles.example/1.pbf',
    });

    act(() => {
      map.missingImageResolver?.('ps-pin|ro-sale|EUR|142000');
    });
    expect(pinLabel).toHaveBeenCalledWith(142000, 'EUR');
    expect(canvasContext.fillText).toHaveBeenCalledWith(
      '142k €',
      expect.any(Number),
      expect.any(Number),
    );
    expect(map.addImage).toHaveBeenCalledWith('ps-pin|ro-sale|EUR|142000', expect.anything(), {
      pixelRatio: 1,
    });

    await user.click(screen.getByRole('button', { name: 'next' }));

    const source = map.getSource('ps-listings');
    expect(source && 'setTiles' in source ? source.setTiles : undefined).toHaveBeenLastCalledWith([
      `${TILES_URL}&p_max_price_eur=100000`,
    ]);
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'ps-listings', sourceLayer: 'listings', id: 'a' },
      { hidden: true },
    );

    const pinFeature = {
      geometry: { type: 'Point', coordinates: [21.2, 45.75] },
      properties: { id: 'a', price: 142000, currency: 'EUR' },
    };
    act(() => {
      map.emit('mousemove:ps-listings-pins', { features: [pinFeature] });
      map.emit('click:ps-listings-pins', { features: [pinFeature] });
      map.emit('click:ps-listings-bubbles', {
        features: [{ geometry: { type: 'Point', coordinates: [21.3, 45.76] }, properties: {} }],
      });
    });

    const pin = { id: 'a', position: [21.2, 45.75], price: 142000, currency: 'EUR' };
    expect(onPinHover).toHaveBeenCalledWith(pin);
    expect(onPinSelect).toHaveBeenCalledWith(pin);
    expect(map.easeTo).toHaveBeenCalledWith({ center: [21.3, 45.76], zoom: 16 });
  });

  it('masks everything outside the outline, shades the regions and reports a picked region', async () => {
    const onSelect = vi.fn();
    const { user } = await renderWithProviders(<RegionsHarness onSelect={onSelect} />);
    const map = lastMap();
    act(() => {
      map.emit('style.load');
    });

    expect(map.addedLayers.map((layer) => layer.id)).toEqual(
      expect.arrayContaining([
        'ps-regions-areas',
        'ps-regions-mask',
        'ps-regions-outline',
        'ps-regions-areas-selected',
      ]),
    );

    map.zoom = 6;
    act(() => {
      map.emit('click:ps-regions-areas', { features: [{ properties: { id: 'timis' } }] });
    });
    expect(onSelect).toHaveBeenCalledWith('timis');

    await user.click(screen.getByRole('button', { name: 'select' }));

    expect(map.setFilter).toHaveBeenLastCalledWith('ps-regions-areas-selected', [
      '==',
      ['get', 'id'],
      'timis',
    ]);
  });

  it('zooms through its controller and flies to a focus with a zoom', async () => {
    const { user } = await renderWithProviders(<ControllerHarness />);
    const map = lastMap();

    await user.click(screen.getByRole('button', { name: 'in' }));
    await user.click(screen.getByRole('button', { name: 'out' }));
    expect(map.zoomIn).toHaveBeenCalledOnce();
    expect(map.zoomOut).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'fly' }));

    expect(map.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [26.1, 44.43], zoom: 11.25 }),
    );
  });
});

const TIMIS_REGIONS: Omit<MapRegions, 'selectedId' | 'onSelect'> = {
  outline: [
    [
      [
        [20, 43],
        [30, 43],
        [30, 49],
        [20, 43],
      ],
    ],
  ],
  areas: [
    {
      id: 'timis',
      label: 'Județul Timiș · 2 locuințe',
      weight: 1,
      coordinates: [
        [
          [
            [20.5, 45.2],
            [22.5, 45.2],
            [22.5, 46.2],
            [20.5, 45.2],
          ],
        ],
      ],
    },
  ],
};

type RegionsHarnessProps = {
  onSelect: (id: string) => void;
};

function RegionsHarness({ onSelect }: RegionsHarnessProps) {
  const [selectedId, setSelectedId] = useState<string>();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedId('timis');
        }}
      >
        select
      </button>
      <MapCanvas
        label={LABEL}
        center={CENTER}
        zoom={6}
        markers={[]}
        onError={vi.fn()}
        regions={{ ...TIMIS_REGIONS, selectedId, onSelect }}
      />
    </>
  );
}

function ControllerHarness() {
  const controller = useRef<MapCanvasController>(null);
  const [focus, setFocus] = useState<MapFocus>();

  return (
    <>
      <button type="button" onClick={() => controller.current?.zoomIn()}>
        in
      </button>
      <button type="button" onClick={() => controller.current?.zoomOut()}>
        out
      </button>
      <button
        type="button"
        onClick={() => {
          setFocus({ position: [26.1, 44.43], zoom: 11.25, requestId: 1 });
        }}
      >
        fly
      </button>
      <MapCanvas
        ref={controller}
        label={LABEL}
        center={CENTER}
        zoom={6}
        focus={focus}
        markers={[]}
        onError={vi.fn()}
      />
    </>
  );
}
