import { useState } from 'react';

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch {
    return;
  }
}

export function useStoredFlag(key: string) {
  const [isOn, setIsOn] = useState(() => readFlag(key));

  const toggle = () => {
    const next = !isOn;
    setIsOn(next);
    writeFlag(key, next);
  };

  return { isOn, toggle };
}
