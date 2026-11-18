import { useSyncExternalStore } from 'react';

const NARROW_QUERY = '(max-width: 760px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}

function isNarrow(): boolean {
  return window.matchMedia(NARROW_QUERY).matches;
}

export function useIsNarrowScreen(): boolean {
  return useSyncExternalStore(subscribe, isNarrow, () => false);
}
