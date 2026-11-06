import {
  BedDoubleIcon,
  BedSingleIcon,
  BuildingIcon,
  CalendarIcon,
  RulerIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useListingPrice } from './use-listing-price';

const MOSAIC_PHOTO_COUNT = 4;

export type ListingFact = { key: string; icon: LucideIcon; label: string };

type SummaryPhoto = { id: string; src: string; smallSrc: string };

type SummaryListing = {
  transaction: 'sale' | 'rent';
  title: string;
  city: string;
  price: number;
  currency: string;
  area_m2: number;
  rooms: number;
  floor: number | null;
  building_floors: number | null;
  year_built: number | null;
  description: string | null;
};

type Translate = ReturnType<typeof useTranslation<'common'>>['t'];

function floorLabel(floor: number, total: number | null, t: Translate): string {
  if (floor === 0) {
    return t('listingSummary.facts.groundFloor');
  }
  if (floor < 0) {
    return t('listingSummary.facts.basement');
  }
  return total === null
    ? t('listingSummary.facts.floorOnly', { floor })
    : t('listingSummary.facts.floor', { floor, total });
}

function listingFacts(listing: SummaryListing, area: string, t: Translate): ListingFact[] {
  const facts: ListingFact[] = [
    {
      key: 'rooms',
      icon: listing.rooms > 1 ? BedDoubleIcon : BedSingleIcon,
      label: t('listingSummary.facts.rooms', { count: listing.rooms }),
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
      label: t('listingSummary.facts.yearBuilt', { year: listing.year_built }),
    });
  }
  return facts;
}

export function useListingSummary(listing: SummaryListing, photos: readonly SummaryPhoto[]) {
  const { t } = useTranslation();
  const { price, area } = useListingPrice(listing);
  const hidden = Math.max(0, photos.length - MOSAIC_PHOTO_COUNT);
  return {
    eyebrow: t('listingSummary.dealCity', {
      deal: t(`listingSummary.transaction.${listing.transaction}`),
      city: listing.city,
    }),
    title: listing.title,
    price,
    area,
    facts: listingFacts(listing, area, t),
    description: listing.description,
    photos: photos.map((photo, index) => ({
      ...photo,
      alt: t('listingSummary.photoAlt', {
        index: index + 1,
        total: photos.length,
        title: listing.title,
      }),
    })),
    moreLabel: hidden > 0 ? t('listingSummary.morePhotos', { count: hidden }) : undefined,
    emptyLabel: t('listingSummary.noPhotos'),
  };
}

export type ListingSummaryContent = ReturnType<typeof useListingSummary>;
