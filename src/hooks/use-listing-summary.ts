import {
  BathIcon,
  BedDoubleIcon,
  BedSingleIcon,
  BuildingIcon,
  CalendarIcon,
  LandPlotIcon,
  LayersIcon,
  RulerIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatList, formatNumber } from '@/i18n/format';
import type { Tables } from '@/lib/supabase/database.types';
import { useListingPrice } from './use-listing-price';

const MOSAIC_PHOTO_COUNT = 3;

export type ListingFact = { key: string; icon: LucideIcon; label: string };

export type ListingDetail = { key: string; label: string; value: string };

type SummaryPhoto = { id: string; src: string; smallSrc: string };

type SummaryListing = Pick<
  Tables<'listings'>,
  | 'property_type'
  | 'title'
  | 'city'
  | 'price'
  | 'currency'
  | 'area_m2'
  | 'rooms'
  | 'floor'
  | 'building_floors'
  | 'year_built'
  | 'description'
  | 'bathrooms'
  | 'partitioning'
  | 'comfort'
  | 'building_type'
  | 'house_type'
  | 'land_area_m2'
  | 'has_basement'
  | 'has_semibasement'
  | 'has_attic'
  | 'interior_condition'
  | 'heating'
  | 'cooling'
  | 'furnishing'
  | 'pets'
  | 'is_passive_house'
  | 'balconies'
  | 'parking_spaces'
  | 'utilities'
  | 'building_services'
  | 'has_elevator'
  | 'has_shared_yard'
  | 'pool'
  | 'yard'
> & { transaction: 'sale' | 'rent' };

type DetailField =
  | 'houseType'
  | 'buildingType'
  | 'partitioning'
  | 'comfort'
  | 'levels'
  | 'interiorCondition'
  | 'heating'
  | 'cooling'
  | 'furnishing'
  | 'pets'
  | 'balconies'
  | 'parkingSpaces'
  | 'utilities'
  | 'buildingServices'
  | 'pool'
  | 'yard'
  | 'features';

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
  if (listing.bathrooms !== null) {
    facts.push({
      key: 'bathrooms',
      icon: BathIcon,
      label: t('listingSummary.facts.bathrooms', { count: listing.bathrooms }),
    });
  }
  if (listing.land_area_m2 !== null) {
    facts.push({
      key: 'land',
      icon: LandPlotIcon,
      label: t('listingSummary.facts.landArea', {
        area: t('listingSummary.area', { value: formatNumber(listing.land_area_m2) }),
      }),
    });
  }
  if (listing.floor !== null) {
    facts.push({
      key: 'floor',
      icon: BuildingIcon,
      label: floorLabel(listing.floor, listing.building_floors, t),
    });
  } else if (listing.property_type === 'house' && listing.building_floors !== null) {
    facts.push({
      key: 'levels',
      icon: LayersIcon,
      label: t('listingSummary.facts.levels', { count: listing.building_floors }),
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

function listingDetails(listing: SummaryListing, t: Translate): ListingDetail[] {
  const levels = [
    listing.has_basement ? t('listingDetails.flags.hasBasement') : null,
    listing.has_semibasement ? t('listingDetails.flags.hasSemibasement') : null,
    listing.has_attic ? t('listingDetails.flags.hasAttic') : null,
  ];
  const features = [
    listing.has_elevator ? t('listingDetails.flags.hasElevator') : null,
    listing.has_shared_yard ? t('listingDetails.flags.hasSharedYard') : null,
    listing.is_passive_house ? t('listingDetails.flags.isPassiveHouse') : null,
  ];
  const entries: [DetailField, string | null][] = [
    [
      'houseType',
      listing.house_type && t(`listingDetails.options.houseType.${listing.house_type}`),
    ],
    [
      'buildingType',
      listing.building_type && t(`listingDetails.options.buildingType.${listing.building_type}`),
    ],
    [
      'partitioning',
      listing.partitioning && t(`listingDetails.options.partitioning.${listing.partitioning}`),
    ],
    [
      'comfort',
      listing.comfort &&
        t('listingDetails.comfortValue', {
          value: t(`listingDetails.options.comfort.${listing.comfort}`),
        }),
    ],
    ['levels', joined(levels)],
    [
      'interiorCondition',
      listing.interior_condition &&
        t(`listingDetails.options.interiorCondition.${listing.interior_condition}`),
    ],
    ['heating', listing.heating && t(`listingDetails.options.heating.${listing.heating}`)],
    ['cooling', listing.cooling && t(`listingDetails.options.cooling.${listing.cooling}`)],
    [
      'furnishing',
      listing.furnishing && t(`listingDetails.options.furnishing.${listing.furnishing}`),
    ],
    ['pets', listing.pets && t(`listingDetails.options.pets.${listing.pets}`)],
    ['balconies', listing.balconies === null ? null : formatNumber(listing.balconies)],
    [
      'parkingSpaces',
      listing.parking_spaces === null ? null : formatNumber(listing.parking_spaces),
    ],
    [
      'utilities',
      joined(listing.utilities.map((utility) => t(`listingDetails.options.utilities.${utility}`))),
    ],
    [
      'buildingServices',
      joined(
        listing.building_services.map((service) =>
          t(`listingDetails.options.buildingServices.${service}`),
        ),
      ),
    ],
    ['pool', listing.pool && t(`listingDetails.options.pool.${listing.pool}`)],
    ['yard', listing.yard && t(`listingDetails.options.yard.${listing.yard}`)],
    ['features', joined(features)],
  ];
  return entries.flatMap(([key, value]) =>
    value ? [{ key, label: t(`listingDetails.fields.${key}`), value }] : [],
  );
}

function joined(values: readonly (string | null)[]): string | null {
  const present = values.filter((value) => value !== null);
  return present.length > 0 ? formatList(present) : null;
}

export function useListingSummary(listing: SummaryListing, photos: readonly SummaryPhoto[]) {
  const { t } = useTranslation();
  const { price, area } = useListingPrice(listing);
  const hidden = Math.max(0, photos.length - MOSAIC_PHOTO_COUNT);
  return {
    eyebrow: t('listingSummary.dealCity', {
      deal: t(`listingSummary.typeDeal.${listing.property_type}.${listing.transaction}`),
      city: listing.city,
    }),
    title: listing.title,
    price,
    area,
    facts: listingFacts(listing, area, t),
    detailsHeading: t('listingDetails.heading'),
    details: listingDetails(listing, t),
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
