import { createContext, useContext, useEffect } from 'react';

export type SiteHeroTone = 'physical';

export const SITE_HERO_SURFACE = {
  physical: 'bg-trust-physical',
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
