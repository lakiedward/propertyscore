import { useState } from 'react';

const STORAGE_KEY = 'ps-sb-closed';

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(isCollapsed: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, isCollapsed ? '1' : '0');
  } catch {
    return;
  }
}

export function useSidebarCollapsed() {
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);

  const toggle = () => {
    setIsCollapsed((current) => {
      writeCollapsed(!current);
      return !current;
    });
  };

  return { isCollapsed, toggle };
}
