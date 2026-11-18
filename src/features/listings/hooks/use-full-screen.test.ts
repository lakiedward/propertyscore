import { act, renderHook } from '@testing-library/react';
import { useFullScreen } from './use-full-screen';

describe('useFullScreen', () => {
  it('stops the page from scrolling while full screen and leaves it with Escape', () => {
    const { result } = renderHook(() => useFullScreen());

    act(() => {
      result.current.setIsFullScreen(true);
    });
    expect(document.body.style.overflow).toBe('hidden');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.isFullScreen).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });
});
