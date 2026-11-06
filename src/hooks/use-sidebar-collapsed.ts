import { useState } from 'react';

export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'ps-sb-closed';

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(isCollapsed: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, isCollapsed ? '1' : '0');
  } catch {
    return;
  }
}

export function useSidebarCollapsed() {
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);

  const toggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    writeCollapsed(next);
  };

  return { isCollapsed, toggle };
}
