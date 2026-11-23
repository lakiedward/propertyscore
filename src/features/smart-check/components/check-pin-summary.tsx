import { LoaderCircleIcon, MapPinCheckIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LngLat } from '@/components/map/map.config';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import type { usePinnedAddress } from '../hooks/use-pinned-address';

const COORDINATE_DIGITS = 5;

type CheckPinSummaryProps = {
  address: string;
  pin: LngLat;
  reverseState: ReturnType<typeof usePinnedAddress>['reverseState'];
  className?: string;
};

function formatCoordinate(value: number): string {
  return formatNumber(value, {
    minimumFractionDigits: COORDINATE_DIGITS,
    maximumFractionDigits: COORDINATE_DIGITS,
  });
}

export function CheckPinSummary({ address, pin, reverseState, className }: CheckPinSummaryProps) {
  const { t } = useTranslation('smartCheck');
  const isResolving = reverseState === 'resolving';
  const note =
    reverseState === 'notFound' || reverseState === 'failed'
      ? t('check.address.noReverse')
      : t('check.address.manualHint');

  return (
    <div
      aria-live="polite"
      className={cn(
        'flex items-start gap-3.5 rounded-lg bg-category-education-surface p-4',
        className,
      )}
    >
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-md bg-card text-info"
      >
        {isResolving ? (
          <LoaderCircleIcon className="size-4.5 animate-spin" />
        ) : (
          <MapPinCheckIcon className="size-4.5" />
        )}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-body-sm font-extrabold break-words text-foreground">
          {isResolving
            ? t('check.address.resolving')
            : address || t('check.address.addressMissing')}
        </p>
        <p className="text-small text-ink-soft tabular-nums">
          {t('check.address.coordinates', {
            lat: formatCoordinate(pin[1]),
            lng: formatCoordinate(pin[0]),
          })}
        </p>
        <p className="text-caption text-ink-soft">{note}</p>
      </div>
    </div>
  );
}
