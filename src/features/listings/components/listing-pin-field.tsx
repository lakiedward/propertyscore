import { MapPinIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import type { LngLat } from '@/components/map/map.config';

const ROMANIA_CENTER: LngLat = [24.9668, 45.9432];
const COUNTRY_ZOOM = 6;
const CITY_ZOOM = 13;
const PIN_ZOOM = 16;
const PIN_MARKER_ID = 'listing-pin';

type ListingPinFieldProps = {
  id: string;
  value: LngLat | null;
  cityCenter: LngLat | undefined;
  isDisabled: boolean;
  isInvalid: boolean;
  describedBy: string;
  onChange: (value: LngLat) => void;
};

export function ListingPinField({
  id,
  value,
  cityCenter,
  isDisabled,
  isInvalid,
  describedBy,
  onChange,
}: ListingPinFieldProps) {
  const { t } = useTranslation('myListings');
  const center = value ?? cityCenter ?? ROMANIA_CENTER;
  const zoom = value ? PIN_ZOOM : cityCenter ? CITY_ZOOM : COUNTRY_ZOOM;
  const focusKey = cityCenter ? cityCenter.join(',') : 'country';

  return (
    <div
      id={id}
      aria-invalid={isInvalid}
      aria-describedby={describedBy}
      className="overflow-hidden rounded-md border border-border aria-invalid:border-destructive"
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
