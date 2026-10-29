import { useEffect, useState } from 'react';

const ACTIVE_LINE = 120;
const PAGE_END_TOLERANCE = 4;

function findActiveSection(sectionIds: readonly string[]): string | undefined {
  let activeId: string | undefined;
  let lastPresentId: string | undefined;
  for (const id of sectionIds) {
    const element = document.getElementById(id);
    if (!element) {
      continue;
    }
    lastPresentId = id;
    if (element.getBoundingClientRect().top <= ACTIVE_LINE) {
      activeId = id;
    }
  }
  const root = document.documentElement;
  const isAtPageEnd =
    window.scrollY > 0 &&
    window.scrollY >= root.scrollHeight - window.innerHeight - PAGE_END_TOLERANCE;
  if (isAtPageEnd && lastPresentId === sectionIds.at(-1)) {
    return lastPresentId;
  }
  return activeId;
}

export function useActiveSection(sectionIds: readonly string[]): string | undefined {
  const [activeId, setActiveId] = useState<string>();
  const idsKey = sectionIds.join('|');

  useEffect(() => {
    const ids = idsKey.split('|');
    let frame = 0;
    const update = () => {
      frame = 0;
      setActiveId(findActiveSection(ids));
    };
    const schedule = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
    };
  }, [idsKey]);

  return activeId;
}
