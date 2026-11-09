import { XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ListingMapPopupProps = {
  variant: 'popup' | 'sheet';
  photoUrl: string | undefined;
  title: string;
  address: string;
  price: string;
  isRent: boolean;
  onClose: () => void;
};

export function ListingMapPopup({
  variant,
  photoUrl,
  title,
  address,
  price,
  isRent,
  onClose,
}: ListingMapPopupProps) {
  const { t } = useTranslation(['listings', 'common']);
  const isPopup = variant === 'popup';

  return (
    <div
      className={cn(
        'relative text-foreground',
        isPopup
          ? 'w-65 rounded-tile bg-card shadow-map-popup after:absolute after:-bottom-1.5 after:left-1/2 after:size-3 after:-translate-x-1/2 after:rotate-45 after:bg-card'
          : 'flex gap-3 pr-10',
      )}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          className={cn(
            'block shrink-0 bg-surface-alt object-cover',
            isPopup ? 'h-35 w-full rounded-t-tile' : 'size-27.5 rounded-lg',
          )}
        />
      ) : null}
      <div className={cn('flex min-w-0 flex-col gap-0.75', isPopup && 'px-3.5 pt-3 pb-3.5')}>
        <strong className="mt-1 text-body leading-[1.25]">{title}</strong>
        <span className="text-meta text-muted-foreground">{address}</span>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <strong className="text-[18px] font-extrabold tracking-[-0.025em] text-brand tabular-nums">
            {price}
            {isRent ? (
              <small className="ml-1 text-caption font-semibold tracking-normal">
                {t('listings:explore.perMonthSuffix')}
              </small>
            ) : null}
          </strong>
          <Button type="button" size="sm" className="h-9 rounded-md px-3 text-meta font-control">
            {t('listings:explore.popup.viewListing')}
          </Button>
        </div>
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label={t('common:actions.close')}
        onClick={onClose}
        className={cn(
          'absolute rounded-full border-0 bg-card text-brand shadow-map-control',
          isPopup ? 'top-2 right-2 size-7' : '-top-2 -right-2 size-11 shadow-none',
        )}
      >
        <XIcon aria-hidden />
      </Button>
    </div>
  );
}
