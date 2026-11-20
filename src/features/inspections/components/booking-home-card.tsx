import { cva } from 'class-variance-authority';
import { BadgeCheckIcon, CheckIcon, HistoryIcon, HouseIcon, SparklesIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getListingPhotoUrl } from '@/features/listings';
import { formatDate, formatNumber, formatPrice, toCurrency } from '@/i18n/format';
import { cn } from '@/lib/utils';
import type { BookableProperty } from '../inspection.types';

const cardVariants = cva(
  'flex flex-col overflow-hidden rounded-xl bg-card text-left text-foreground outline-none hover:border-border-strong hover:shadow-card-hover focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      isSelected: {
        true: 'border-2 border-primary shadow-[0_0_0_3px_var(--color-secondary)]',
        false: 'border border-border',
      },
    },
  },
);

type BookingHomeCardProps = {
  property: BookableProperty;
  isSelected: boolean;
  onSelect: () => void;
};

export function BookingHomeCard({ property, isSelected, onSelect }: BookingHomeCardProps) {
  const { t } = useTranslation('inspections');
  const isListed = property.listing_id !== null && property.listing_status === 'approved';
  const facts = [t(`propertyType.${property.property_type}`)];
  if (property.rooms !== null) {
    facts.push(t('booking.home.rooms', { count: property.rooms }));
  }
  if (property.area_m2 !== null) {
    facts.push(t('agenda.area', { area: formatNumber(property.area_m2) }));
  }
  if (property.floor !== null && property.building_floors !== null) {
    facts.push(t('agenda.floor', { floor: property.floor, floors: property.building_floors }));
  }
  const note = property.last_inspection_at
    ? { icon: HistoryIcon, text: t('booking.home.note.reinspect'), className: 'text-warning' }
    : isListed
      ? {
          icon: BadgeCheckIcon,
          text: t('booking.home.note.badge'),
          className: 'text-step-leaf-ink',
        }
      : {
          icon: SparklesIcon,
          text: t('booking.home.note.listing'),
          className: 'text-step-leaf-ink',
        };
  const NoteIcon = note.icon;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      className={cardVariants({ isSelected })}
    >
      <div className="relative overflow-hidden">
        {property.photo_path ? (
          <img
            src={getListingPhotoUrl(property.photo_path)}
            alt=""
            loading="lazy"
            className="block aspect-4/3 w-full bg-step-leaf-surface object-cover"
          />
        ) : (
          <span className="grid aspect-4/3 w-full place-items-center bg-step-leaf-surface text-step-leaf-ink">
            <HouseIcon aria-hidden className="size-10" />
          </span>
        )}
        <span
          aria-hidden
          className={
            isSelected
              ? 'absolute top-3 right-3 grid size-8 place-items-center rounded-full border-2 border-primary bg-primary text-cta shadow-booking-chip'
              : 'absolute top-3 right-3 grid size-8 place-items-center rounded-full border-2 border-border-strong bg-card shadow-booking-chip'
          }
        >
          {isSelected ? <CheckIcon className="size-4" /> : null}
        </span>
        <span
          className={
            property.last_inspection_at
              ? 'absolute bottom-3 left-3 rounded-[6px] bg-primary px-2.25 py-1.25 text-[11px] leading-[1.3] font-[760] text-primary-foreground'
              : 'absolute bottom-3 left-3 rounded-[6px] bg-card px-2.25 py-1.25 text-[11px] leading-[1.3] font-[760] text-trust-none-foreground ring-[1.5px] ring-border-control ring-inset'
          }
        >
          {property.last_inspection_at
            ? t('booking.home.tag.inspected', { date: formatDate(property.last_inspection_at) })
            : t('booking.home.tag.none')}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 px-4 pt-3.5 pb-4">
        {property.listing_price !== null && property.listing_currency ? (
          <strong className="mb-1 text-[22px] font-extrabold tracking-[-0.03em] tabular-nums">
            {formatPrice(property.listing_price, toCurrency(property.listing_currency))}
          </strong>
        ) : null}
        <strong className="text-body leading-[1.25] font-bold tracking-[-0.025em]">
          {property.address_text}
        </strong>
        <span className="text-caption text-muted-foreground">
          {isListed && property.listing_transaction
            ? t(`booking.home.status.${property.listing_transaction}`)
            : property.listing_id
              ? t('booking.home.status.unpublished')
              : t('booking.home.status.none')}
        </span>
        <span className="mt-2.5 flex flex-wrap gap-1.5">
          {facts.map((fact) => (
            <span
              key={fact}
              className="inline-flex min-h-6.5 items-center rounded-full bg-surface-alt px-2.25 text-[12.5px] font-[650]"
            >
              {fact}
            </span>
          ))}
        </span>
        <span
          className={cn(
            'mt-auto flex items-start gap-1.5 pt-3 text-caption leading-[1.45]',
            note.className,
          )}
        >
          <NoteIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {note.text}
        </span>
      </div>
    </button>
  );
}
