import { act, renderHook } from '@testing-library/react';
import { useActiveSection } from './use-active-section';

function placeSection(id: string, top: number) {
  const section = document.createElement('section');
  section.id = id;
  vi.spyOn(section, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ y: top, height: 400 }),
  );
  document.body.append(section);
  return section;
}

function moveSection(section: HTMLElement, top: number) {
  vi.spyOn(section, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ y: top, height: 400 }),
  );
}

async function scroll() {
  await act(async () => {
    window.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

describe('useActiveSection', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('marks the last section whose top passed under the header', async () => {
    const first = placeSection('first', 300);
    const second = placeSection('second', 900);
    const { result } = renderHook(() => useActiveSection(['first', 'second']));

    expect(result.current).toBeUndefined();

    moveSection(first, 40);
    await scroll();
    expect(result.current).toBe('first');

    moveSection(first, -500);
    moveSection(second, 100);
    await scroll();
    expect(result.current).toBe('second');
  });

  it('finds sections that render after the header', async () => {
    const { result } = renderHook(() => useActiveSection(['late']));

    placeSection('late', 0);
    await scroll();

    expect(result.current).toBe('late');
  });

  it('marks nothing on a page without these sections', async () => {
    placeSection('other', 0);
    const { result } = renderHook(() => useActiveSection(['first', 'second']));

    await scroll();

    expect(result.current).toBeUndefined();
  });

  it('marks the last section once the page is scrolled to its end', async () => {
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000);
    window.innerHeight = 800;
    placeSection('first', 40);
    placeSection('last', 500);
    const { result } = renderHook(() => useActiveSection(['first', 'last']));
    expect(result.current).toBe('first');

    window.scrollY = 1200;
    await scroll();

    expect(result.current).toBe('last');
    window.scrollY = 0;
  });
});
