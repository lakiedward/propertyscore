import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';

const MapCanvas = lazy(() =>
  import('./map-canvas').then((module) => ({ default: module.MapCanvas })),
);

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

  if (hasMapError) {
    return errorFallback;
  }

  const placeholder = <Skeleton className={fallbackClassName} />;

  if (!isNearViewport) {
    return <Skeleton ref={placeholderRef} className={fallbackClassName} />;
  }

  return (
    <ErrorBoundary
      fallback={errorFallback}
      onError={(error) => {
        logger.error(error);
      }}
    >
      <Suspense fallback={placeholder}>
        <MapCanvas
          {...props}
          onError={() => {
            setHasMapError(true);
          }}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
