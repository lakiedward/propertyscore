import { MapPinIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import { EXAMPLE_LOCATION } from '../publish.example';

export function ExampleLocationMap() {
  const { t } = useTranslation('publish');

  return (
    <span className="relative block h-47.5 overflow-hidden rounded-xl border border-border bg-surface-alt">
      <span inert className="block size-full">
        <LazyMapCanvas
          label={t('steps.preview.mapLabel')}
          center={EXAMPLE_LOCATION.center}
          zoom={EXAMPLE_LOCATION.zoom}
          markers={[]}
          className="size-full rounded-none"
          fallbackClassName="size-full rounded-none"
          errorFallback={null}
        />
      </span>
      <span className="pointer-events-none absolute top-1/2 left-1/2 size-30 -translate-1/2 rounded-full border-2 border-dashed border-primary bg-primary/12" />
      <MapPinIcon className="pointer-events-none absolute top-1/2 left-1/2 size-7.5 -translate-x-1/2 -translate-y-full fill-card text-primary" />
      <span className="pointer-events-none absolute bottom-1.5 left-2 rounded-[3px] bg-card/80 px-1.5 py-px text-micro leading-copy text-muted-foreground">
        {t('steps.preview.mapLabel')}
      </span>
    </span>
  );
}
