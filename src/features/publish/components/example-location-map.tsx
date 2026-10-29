import { MapPinIcon } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { EXAMPLE_LOCATION } from '../publish.example';

const MapCanvas = lazy(() =>
  import('@/components/map/map-canvas').then((module) => ({ default: module.MapCanvas })),
);

export function ExampleLocationMap() {
  const { t } = useTranslation('publish');
  const [hasMapError, setHasMapError] = useState(false);

  return (
    <span className="relative block h-47.5 overflow-hidden rounded-xl border border-border bg-surface-alt">
      <span inert className="block size-full">
        {hasMapError ? null : (
          <Suspense fallback={<Skeleton className="size-full rounded-none" />}>
            <MapCanvas
              label={t('steps.preview.mapLabel')}
              center={EXAMPLE_LOCATION.center}
              zoom={EXAMPLE_LOCATION.zoom}
              markers={[]}
              onError={() => {
                setHasMapError(true);
              }}
              className="size-full rounded-none"
            />
          </Suspense>
        )}
      </span>
      <span className="pointer-events-none absolute top-1/2 left-1/2 size-30 -translate-1/2 rounded-full border-2 border-dashed border-primary bg-primary/12" />
      <MapPinIcon className="pointer-events-none absolute top-1/2 left-1/2 size-7.5 -translate-x-1/2 -translate-y-full fill-card text-primary" />
      <span className="pointer-events-none absolute bottom-1.5 left-2 rounded-[3px] bg-card/80 px-1.5 py-px text-[10px] leading-[1.55] text-muted-foreground">
        {t('steps.preview.mapLabel')}
      </span>
    </span>
  );
}
