import { act, renderHook } from '@testing-library/react';
import { useScrollProgress } from './use-scroll-progress';

const VIEWPORT_HEIGHT = 800;
const PAGE_HEIGHT = 2800;

async function scrollTo(y: number) {
  await act(async () => {
    window.scrollY = y;
    window.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

describe('useScrollProgress', () => {
  beforeEach(() => {
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(PAGE_HEIGHT);
    window.innerHeight = VIEWPORT_HEIGHT;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.scrollY = 0;
  });

  it('writes how far the page has been scrolled to the element', async () => {
    const element = document.createElement('header');
    renderHook(() => {
      useScrollProgress({ current: element });
    });
    expect(element.style.getPropertyValue('--page-progress')).toBe('0');

    await scrollTo(1000);
    expect(element.style.getPropertyValue('--page-progress')).toBe('0.5');

    await scrollTo(5000);
    expect(element.style.getPropertyValue('--page-progress')).toBe('1');
  });
});
