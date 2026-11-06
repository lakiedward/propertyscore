import {
  BedDoubleIcon,
  BedSingleIcon,
  BuildingIcon,
  CalendarIcon,
  RulerIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PhotoMosaic } from '@/components/media/photo-mosaic';
import { FactChip } from '@/components/property/fact-chip';
import { getListingPhotoUrl } from '@/features/listings';
import { useListingPrice } from '../hooks/use-listing-price';
import type { ReviewListing } from '../moderation.types';
import { hiddenPhotoCount } from '../moderation.utils';

type ListingSummaryProps = {
  listing: ReviewListing;
  titleId?: string;
};

type Fact = { key: string; icon: LucideIcon; label: string };

export function ListingSummary({ listing, titleId }: ListingSummaryProps) {
  const { t } = useTranslation('moderation');
  const { price, area } = useListingPrice(listing);
  const hidden = hiddenPhotoCount(listing.photos.length);
  const photos = listing.photos.map((photo, index) => ({
    id: photo.id,
    src: getListingPhotoUrl(photo.path),
    alt: t('listing.photoAlt', {
      index: index + 1,
      total: listing.photos.length,
      title: listing.title,
    }),
  }));
  const facts = listingFacts(listing, area, t);

  return (
    <>
      <PhotoMosaic
        photos={photos}
        moreLabel={hidden > 0 ? t('listing.morePhotos', { count: hidden }) : undefined}
        emptyLabel={t('listing.noPhotos')}
      />
      <div className="flex flex-col gap-4 px-5.5 pt-4.5">
        <div className="flex flex-col gap-1">
          <p className="text-meta text-muted-foreground">
            {t('listing.dealCity', {
              deal: t(`listing.transaction.${listing.transaction}`),
              city: listing.city,
            })}
          </p>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id={titleId} className="text-h3 font-extrabold tracking-[-0.02em] text-foreground">
              {listing.title}
            </h2>
            <p className="text-h3 font-extrabold tracking-[-0.02em] text-foreground tabular-nums">
              {price}
            </p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-2">
          {facts.map((fact) => (
            <li key={fact.key}>
              <FactChip icon={fact.icon} label={fact.label} />
            </li>
          ))}
        </ul>
        {listing.description ? (
          <p className="text-body-sm leading-[1.6] whitespace-pre-line text-foreground">
            {listing.description}
          </p>
        ) : null}
      </div>
    </>
  );
}

function floorLabel(
  floor: number,
  total: number | null,
  t: ReturnType<typeof useTranslation<'moderation'>>['t'],
): string {
  if (floor === 0) {
    return t('listing.facts.groundFloor');
  }
  if (floor < 0) {
    return t('listing.facts.basement');
  }
  return total === null
    ? t('listing.facts.floorOnly', { floor })
    : t('listing.facts.floor', { floor, total });
}

function listingFacts(
  listing: ReviewListing,
  area: string,
  t: ReturnType<typeof useTranslation<'moderation'>>['t'],
): Fact[] {
  const facts: Fact[] = [
    {
      key: 'rooms',
      icon: listing.rooms > 1 ? BedDoubleIcon : BedSingleIcon,
      label: t('listing.facts.rooms', { count: listing.rooms }),
    },
    { key: 'area', icon: RulerIcon, label: area },
  ];
  if (listing.floor !== null) {
    facts.push({
      key: 'floor',
      icon: BuildingIcon,
      label: floorLabel(listing.floor, listing.building_floors, t),
    });
  }
  if (listing.year_built !== null) {
    facts.push({
      key: 'year',
      icon: CalendarIcon,
      label: t('listing.facts.yearBuilt', { year: listing.year_built }),
    });
  }
  return facts;
}
