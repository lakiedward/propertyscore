import { useEffect, useState } from 'react';

export function useCooldown(seconds: number, isActiveAtStart = false) {
  const [endsAt, setEndsAt] = useState(() => (isActiveAtStart ? Date.now() + seconds * 1000 : 0));
  const [now, setNow] = useState(() => Date.now());
  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const isActive = remaining > 0;

  useEffect(() => {
    if (!isActive) {
      return;
    }
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [isActive]);

  return {
    remaining,
    isActive,
    start: () => {
      const startedAt = Date.now();
      setNow(startedAt);
      setEndsAt(startedAt + seconds * 1000);
    },
  };
}
