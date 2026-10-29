import { useEffect, useState } from 'react';

export function useActiveSection(sectionIds: readonly string[]): string | undefined {
  const [activeId, setActiveId] = useState<string>();
  const idsKey = sectionIds.join('|');

  useEffect(() => {
    const elements = idsKey
      .split('|')
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }
        const firstVisible = elements.find((element) => visible.has(element.id));
        setActiveId(firstVisible?.id);
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    for (const element of elements) {
      observer.observe(element);
    }
    return () => {
      observer.disconnect();
    };
  }, [idsKey]);

  return activeId;
}
