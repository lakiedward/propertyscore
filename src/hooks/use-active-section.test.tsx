import { act, renderHook } from '@testing-library/react';
import { useActiveSection } from './use-active-section';

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

describe('useActiveSection', () => {
  let notify: ObserverCallback = () => undefined;
  const disconnect = vi.fn();

  const first = document.createElement('section');
  const second = document.createElement('section');
  first.id = 'first';
  second.id = 'second';

  beforeEach(() => {
    document.body.append(first, second);
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: ObserverCallback) {
          notify = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    first.remove();
    second.remove();
  });

  it('reports the first section in view, in page order', () => {
    const { result } = renderHook(() => useActiveSection(['first', 'second']));

    act(() => {
      notify([{ target: second, isIntersecting: true, intersectionRatio: 1 }]);
    });
    expect(result.current).toBe('second');

    act(() => {
      notify([{ target: first, isIntersecting: true, intersectionRatio: 0.3 }]);
    });
    expect(result.current).toBe('first');

    act(() => {
      notify([{ target: first, isIntersecting: false, intersectionRatio: 0 }]);
    });
    expect(result.current).toBe('second');
  });

  it('stops observing when unmounted', () => {
    const { unmount } = renderHook(() => useActiveSection(['first']));

    unmount();

    expect(disconnect).toHaveBeenCalled();
  });
});
