import { useEffect, type RefObject } from 'react';

const PROGRESS_PROPERTY = '--page-progress';

function pageProgress(isReducedMotion: boolean): number {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  if (isReducedMotion || scrollable <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, window.scrollY / scrollable));
}

export function useScrollProgress(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const paint = () => {
      frame = 0;
      element.style.setProperty(PROGRESS_PROPERTY, String(pageProgress(reducedMotion.matches)));
    };
    const schedule = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(paint);
      }
    };
    paint();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    reducedMotion.addEventListener('change', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      reducedMotion.removeEventListener('change', schedule);
    };
  }, [ref]);
}
