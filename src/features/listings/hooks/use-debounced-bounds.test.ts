import { act, renderHook } from '@testing-library/react';
import { useDebouncedBounds } from './use-debounced-bounds';

const TIMISOARA = {
  bounds: [
    [21.1, 45.7],
    [21.35, 45.8],
  ] as [[number, number], [number, number]],
  zoom: 12,
};

const CLUJ = {
  bounds: [
    [23.5, 46.7],
    [23.7, 46.8],
  ] as [[number, number], [number, number]],
  zoom: 12,
};

describe('useDebouncedBounds', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the first map area at once and later ones after the map settles', () => {
    const { result } = renderHook(() => useDebouncedBounds());

    act(() => {
      result.current.handleViewportChange(TIMISOARA);
    });
    expect(result.current.bounds).toEqual({ west: 21.1, south: 45.7, east: 21.35, north: 45.8 });

    act(() => {
      result.current.handleViewportChange(CLUJ);
    });
    expect(result.current.bounds?.west).toBe(21.1);

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current.bounds?.west).toBe(23.5);
  });

  it('keeps the same area when the map comes back to it', () => {
    const { result } = renderHook(() => useDebouncedBounds());
    act(() => {
      result.current.handleViewportChange(TIMISOARA);
    });
    const first = result.current.bounds;

    act(() => {
      result.current.handleViewportChange(TIMISOARA);
      vi.advanceTimersByTime(250);
    });

    expect(result.current.bounds).toBe(first);
  });

  it('counts a view of the whole of Romania as no area', () => {
    const { result } = renderHook(() => useDebouncedBounds());

    act(() => {
      result.current.handleViewportChange({
        bounds: [
          [19.9, 43.5],
          [30, 48.4],
        ],
        zoom: 6,
      });
    });

    expect(result.current.bounds).toBeUndefined();
  });
});
