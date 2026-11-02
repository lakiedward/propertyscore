import { act, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

const LABEL = 'Harta proprietăților';
const ERROR_TEXT = 'Harta nu s-a putut încărca.';

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

class IntersectionObserverStub {
  static instances: IntersectionObserverStub[] = [];
  readonly callback: ObserverCallback;
  readonly options: { rootMargin?: string } | undefined;
  isDisconnected = false;

  constructor(callback: ObserverCallback, options?: { rootMargin?: string }) {
    this.callback = callback;
    this.options = options;
    IntersectionObserverStub.instances.push(this);
  }

  observe() {
    return undefined;
  }

  disconnect() {
    this.isDisconnected = true;
  }
}

async function loadLazyMapCanvas(mapCanvasModule: () => Promise<unknown>) {
  vi.resetModules();
  vi.doMock('./map-canvas', mapCanvasModule);
  const { LazyMapCanvas } = await import('./lazy-map-canvas');
  const { mapCanvasStubControl } = await import('@/test/mocks/map-canvas-control');
  return { LazyMapCanvas, mapCanvasStubControl };
}

function stubModule() {
  return import('@/test/mocks/map-canvas');
}

describe('LazyMapCanvas', () => {
  afterEach(() => {
    IntersectionObserverStub.instances = [];
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.doUnmock('./map-canvas');
  });

  it('mounts the map right away when IntersectionObserver is missing', async () => {
    const { LazyMapCanvas } = await loadLazyMapCanvas(stubModule);
    await renderWithProviders(
      <LazyMapCanvas
        label={LABEL}
        center={[21.23, 45.75]}
        zoom={14}
        markers={[]}
        errorFallback={null}
      />,
    );

    expect(await screen.findByRole('region', { name: LABEL })).toBeInTheDocument();
  });

  it('waits until the map is near the viewport', async () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    const { LazyMapCanvas } = await loadLazyMapCanvas(stubModule);
    await renderWithProviders(
      <LazyMapCanvas
        label={LABEL}
        center={[21.23, 45.75]}
        zoom={14}
        markers={[]}
        errorFallback={null}
      />,
    );

    expect(screen.queryByRole('region', { name: LABEL })).not.toBeInTheDocument();
    const [observer] = IntersectionObserverStub.instances;
    expect(observer?.options?.rootMargin).toBe('400px');

    act(() => {
      observer?.callback([{ isIntersecting: true }]);
    });

    expect(await screen.findByRole('region', { name: LABEL })).toBeInTheDocument();
    expect(observer?.isDisconnected).toBe(true);
  });

  it('shows the error fallback when the map reports an error', async () => {
    const { LazyMapCanvas, mapCanvasStubControl } = await loadLazyMapCanvas(stubModule);
    mapCanvasStubControl.shouldFail = true;
    await renderWithProviders(
      <LazyMapCanvas
        label={LABEL}
        center={[21.23, 45.75]}
        zoom={14}
        markers={[]}
        errorFallback={<p>{ERROR_TEXT}</p>}
      />,
    );

    expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: LABEL })).not.toBeInTheDocument();
  });

  it('shows the error fallback when the map chunk fails to load', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { LazyMapCanvas } = await loadLazyMapCanvas(() =>
      Promise.reject(new Error('Failed to fetch dynamically imported module')),
    );
    await renderWithProviders(
      <LazyMapCanvas
        label={LABEL}
        center={[21.23, 45.75]}
        zoom={14}
        markers={[]}
        errorFallback={<p>{ERROR_TEXT}</p>}
      />,
    );

    expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
