import { useEffect, useState } from 'react';

export function useFullScreen() {
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!isFullScreen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen]);

  return { isFullScreen, setIsFullScreen };
}
