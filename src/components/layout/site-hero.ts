import { createContext, useContext, useEffect } from 'react';

export type SiteHeroTone = 'physical' | 'report';

export const SITE_HERO_SURFACE = {
  physical: 'bg-trust-physical',
  report: 'bg-report-hero',
} as const satisfies Record<SiteHeroTone, string>;

export const SiteHeroContext = createContext<(tone: SiteHeroTone | null) => void>(() => undefined);

export function useSiteHero(tone: SiteHeroTone | null) {
  const setHeroTone = useContext(SiteHeroContext);
  useEffect(() => {
    setHeroTone(tone);
    return () => {
      setHeroTone(null);
    };
  }, [setHeroTone, tone]);
}
