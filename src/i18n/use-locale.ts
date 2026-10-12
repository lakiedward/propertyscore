import { useSyncExternalStore } from 'react';
import { currentLocale, i18n, type Locale } from './i18n';

function subscribe(onChange: () => void) {
  i18n.on('languageChanged', onChange);
  return () => {
    i18n.off('languageChanged', onChange);
  };
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, currentLocale);
}
