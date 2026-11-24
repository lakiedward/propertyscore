import { createContext, useContext, useEffect } from 'react';

export const ReportHeroContext = createContext<(hasHero: boolean) => void>(() => undefined);

export function useRegisterReportHero() {
  const setHasHero = useContext(ReportHeroContext);
  useEffect(() => {
    setHasHero(true);
    return () => {
      setHasHero(false);
    };
  }, [setHasHero]);
}
