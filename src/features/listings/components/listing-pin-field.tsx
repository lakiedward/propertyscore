import { MapPinIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import type { LngLat } from '@/components/map/map.config';
import { ROMANIA_CENTER, ROMANIA_ZOOM } from '@/config/listings-explorer';

const CITY_ZOOM = 13;
const PIN_ZOOM = 16;
const PIN_MARKER_ID = 'listing-pin';

type ListingPinFieldProps = {
  labelledBy: string;
  value: LngLat | null;
  cityCenter: LngLat | undefined;
  isDisabled: boolean;
  isInvalid: boolean;
  describedBy: string;
  onChange: (value: LngLat) => void;
};

export function ListingPinField({
  labelledBy,
  value,
  cityCenter,
  isDisabled,
  isInvalid,
  describedBy,
  onChange,
}: ListingPinFieldProps) {
  const { t } = useTranslation('myListings');
  const center = value ?? cityCenter ?? ROMANIA_CENTER;
  const zoom = value ? PIN_ZOOM : cityCenter ? CITY_ZOOM : ROMANIA_ZOOM;
  const focusKey = cityCenter ? cityCenter.join(',') : 'country';

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      data-invalid={isInvalid || undefined}
      aria-describedby={describedBy}
      className="overflow-hidden rounded-md border border-border data-invalid:border-destructive"
    >
      <LazyMapCanvas
        key={value ? 'pinned' : focusKey}
        label={t('form.pin.mapLabel')}
        center={center}
        zoom={zoom}
        markers={
          value
            ? [
                {
                  id: PIN_MARKER_ID,
                  position: value,
                  node: (
                    <MapPinIcon aria-hidden className="size-8 fill-cta text-brand drop-shadow-md" />
                  ),
                },
              ]
            : []
        }
        onPick={isDisabled ? undefined : onChange}
        errorFallback={
          <p className="p-4 text-small text-muted-foreground">{t('form.pin.mapError')}</p>
        }
        className="h-72 rounded-none"
        fallbackClassName="h-72 rounded-none"
      />
    </div>
  );
}
