import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { changeLocale, currentLocale, isLocale } from '@/i18n/i18n';
import { profileQueries } from '../api/profile.queries';

export function useSyncProfileLocale(userId: string) {
  const { data: profile } = useQuery(profileQueries.detail(userId));
  const profileLocale = profile?.locale;

  useEffect(() => {
    if (isLocale(profileLocale) && profileLocale !== currentLocale()) {
      void changeLocale(profileLocale);
    }
  }, [profileLocale]);
}
