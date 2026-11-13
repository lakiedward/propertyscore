import { useStoredFlag } from './use-stored-flag';

export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'ps-sb-closed';

export function useSidebarCollapsed() {
  const { isOn, toggle } = useStoredFlag(SIDEBAR_COLLAPSED_STORAGE_KEY);
  return { isCollapsed: isOn, toggle };
}
