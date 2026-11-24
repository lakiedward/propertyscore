import { MapPinIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import type { LngLat } from '@/components/map/map.config';
import { ROMANIA_CENTER, ROMANIA_ZOOM } from '@/config/listings-explorer';
import { cn } from '@/lib/utils';

const PIN_ZOOM = 17;
const PIN_MARKER_ID = 'check-pin';

type CheckPinMapProps = {
  pin: LngLat | null;
  focusRequest: number;
  isPickable: boolean;
  className: string;
  children?: ReactNode;
  onPin: (position: LngLat) => void;
};

export function CheckPinMap({
  pin,
  focusRequest,
  isPickable,
  className,
  children,
  onPin,
}: CheckPinMapProps) {
  const { t } = useTranslation('smartCheck');
  const handlePin = isPickable ? onPin : undefined;

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-border', className)}>
      <LazyMapCanvas
        label={t('check.address.mapLabel')}
        center={pin ?? ROMANIA_CENTER}
        zoom={pin ? PIN_ZOOM : ROMANIA_ZOOM}
        focus={
          pin && focusRequest > 0
            ? { position: pin, zoom: PIN_ZOOM, requestId: focusRequest }
            : undefined
        }
        hasCooperativeGestures
        markers={
          pin
            ? [
                {
                  id: PIN_MARKER_ID,
                  position: pin,
                  onDragEnd: handlePin,
                  node: (
                    <MapPinIcon
                      role="img"
                      aria-label={t('check.address.pinLabel')}
                      className={cn(
                        'size-10 fill-brand text-card drop-shadow-md [&_circle]:fill-cta [&_circle]:stroke-brand',
                        isPickable && 'cursor-grab active:cursor-grabbing',
                      )}
                    />
                  ),
                },
              ]
            : []
        }
        onPick={handlePin}
        errorFallback={
          <p className="grid size-full place-items-center bg-surface-sunken p-4 text-small text-muted-foreground">
            {t('check.address.mapError')}
          </p>
        }
        className="size-full rounded-none"
        fallbackClassName="size-full rounded-none"
      />
      {children}
    </div>
  );
}
