import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';
import { getLoadedMapCanvas, loadMapCanvas } from './load-map-canvas';
import type { MapCanvas } from './map-canvas';

const NEAR_VIEWPORT_MARGIN = '400px';

type LazyMapCanvasProps = Omit<ComponentProps<typeof MapCanvas>, 'onError'> & {
  errorFallback: ReactNode;
  fallbackClassName?: string;
};

function canObserveIntersections(): boolean {
  return typeof IntersectionObserver !== 'undefined';
}

export function LazyMapCanvas({ errorFallback, fallbackClassName, ...props }: LazyMapCanvasProps) {
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(() => !canObserveIntersections());
  const [mapModule, setMapModule] = useState(getLoadedMapCanvas);
  const [hasMapError, setHasMapError] = useState(false);

  useEffect(() => {
    const placeholder = placeholderRef.current;
    if (isNearViewport || !placeholder) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          setIsNearViewport(true);
        }
      },
      { rootMargin: NEAR_VIEWPORT_MARGIN },
    );
    observer.observe(placeholder);
    return () => {
      observer.disconnect();
    };
  }, [isNearViewport]);

  useEffect(() => {
    if (!isNearViewport || mapModule) {
      return;
    }
    let isCurrent = true;
    loadMapCanvas().then(
      (module) => {
        if (isCurrent) {
          setMapModule(module);
        }
      },
      (error: unknown) => {
        logger.error(error);
        if (isCurrent) {
          setHasMapError(true);
        }
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [isNearViewport, mapModule]);

  if (hasMapError) {
    return errorFallback;
  }

  if (!isNearViewport || !mapModule) {
    return <Skeleton ref={placeholderRef} className={fallbackClassName} />;
  }

  const LoadedMapCanvas = mapModule.MapCanvas;

  return (
    <ErrorBoundary
      fallback={errorFallback}
      onError={(error) => {
        logger.error(error);
      }}
    >
      <LoadedMapCanvas
        {...props}
        onError={() => {
          setHasMapError(true);
        }}
      />
    </ErrorBoundary>
  );
}
