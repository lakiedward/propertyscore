import { z } from 'zod';
import { formatNumber, parseLocaleNumber } from '@/i18n/format';
import { messageKey, validationMessage } from '@/i18n/validation';
import type { TablesInsert } from '@/lib/supabase/database.types';

const CURRENT_YEAR = new Date().getFullYear();

export const LISTING_TITLE_MAX = 70;

export const LISTING_DESCRIPTION_MAX = 3000;

type NumberRule = { min: number; max: number; isInteger?: boolean; isRequired: boolean };

function localeNumber({ min, max, isInteger = false, isRequired }: NumberRule) {
  return z.string().superRefine((input, context) => {
    if (input.trim() === '') {
      if (isRequired) {
        context.addIssue({ code: 'custom', message: validationMessage('required') });
      }
      return;
    }
    const value = parseLocaleNumber(input);
    if (value === undefined || (isInteger && !Number.isInteger(value))) {
      context.addIssue({ code: 'custom', message: validationMessage('number') });
      return;
    }
    if (value < min) {
      context.addIssue({ code: 'custom', message: validationMessage('min', { min }) });
    } else if (value > max) {
      context.addIssue({ code: 'custom', message: validationMessage('max', { max }) });
    }
  });
}

export const listingFormSchema = z
  .object({
    transaction: z.enum(['sale', 'rent']),
    title: z.string().trim().min(1).max(LISTING_TITLE_MAX),
    city: z.string().trim().min(1).max(80),
    street_label: z.string().trim().min(1).max(120),
    rooms: localeNumber({ min: 1, max: 20, isInteger: true, isRequired: true }),
    area_m2: localeNumber({ min: 1, max: 99_999, isRequired: true }),
    price: localeNumber({ min: 1, max: 9_999_999_999, isRequired: true }),
    currency: z.enum(['EUR', 'RON']),
    floor: localeNumber({ min: -1, max: 80, isInteger: true, isRequired: false }),
    building_floors: localeNumber({ min: 0, max: 80, isInteger: true, isRequired: false }),
    year_built: localeNumber({
      min: 1800,
      max: CURRENT_YEAR + 5,
      isInteger: true,
      isRequired: false,
    }),
    description: z.string().trim().max(LISTING_DESCRIPTION_MAX),
    pin: z.tuple([z.number(), z.number()]).nullable(),
  })
  .refine((values) => values.pin !== null, {
    path: ['pin'],
    message: validationMessage('required'),
  })
  .refine(
    (values) => {
      const floor = parseLocaleNumber(values.floor);
      const buildingFloors = parseLocaleNumber(values.building_floors);
      return floor === undefined || buildingFloors === undefined || floor <= buildingFloors;
    },
    {
      path: ['floor'],
      message: messageKey('common:errors.reasons.listing_floor_above_building'),
    },
  );

export type ListingFormValues = z.input<typeof listingFormSchema>;

export type ListingWrite = Pick<
  TablesInsert<'listings'>,
  | 'transaction'
  | 'title'
  | 'city'
  | 'street_label'
  | 'rooms'
  | 'area_m2'
  | 'price'
  | 'currency'
  | 'floor'
  | 'building_floors'
  | 'year_built'
  | 'description'
  | 'latitude'
  | 'longitude'
>;

function optionalNumber(input: string): number | null {
  return input.trim() === '' ? null : (parseLocaleNumber(input) ?? null);
}

function requiredNumber(input: string): number {
  return parseLocaleNumber(input) ?? 0;
}

export function toListingWrite(values: ListingFormValues): ListingWrite {
  const [longitude, latitude] = values.pin ?? [0, 0];
  const description = values.description.trim();
  return {
    transaction: values.transaction,
    title: values.title.trim(),
    city: values.city.trim(),
    street_label: values.street_label.trim(),
    rooms: requiredNumber(values.rooms),
    area_m2: requiredNumber(values.area_m2),
    price: requiredNumber(values.price),
    currency: values.currency,
    floor: optionalNumber(values.floor),
    building_floors: optionalNumber(values.building_floors),
    year_built: optionalNumber(values.year_built),
    description: description === '' ? null : description,
    latitude,
    longitude,
  };
}

type StoredListing = Pick<
  ListingWrite,
  'title' | 'city' | 'street_label' | 'rooms' | 'area_m2' | 'price'
> & {
  transaction: 'sale' | 'rent';
  currency: string;
  floor: number | null;
  building_floors: number | null;
  year_built: number | null;
  description: string | null;
  latitude: number;
  longitude: number;
};

function asText(value: number | null): string {
  return value === null
    ? ''
    : formatNumber(value, { useGrouping: false, maximumFractionDigits: 2 });
}

export function toListingFormValues(listing: StoredListing | null): ListingFormValues {
  if (!listing) {
    return {
      transaction: 'sale',
      title: '',
      city: '',
      street_label: '',
      rooms: '',
      area_m2: '',
      price: '',
      currency: 'EUR',
      floor: '',
      building_floors: '',
      year_built: '',
      description: '',
      pin: null,
    };
  }
  return {
    transaction: listing.transaction,
    title: listing.title,
    city: listing.city,
    street_label: listing.street_label,
    rooms: asText(listing.rooms),
    area_m2: asText(listing.area_m2),
    price: asText(listing.price),
    currency: listing.currency === 'RON' ? 'RON' : 'EUR',
    floor: asText(listing.floor),
    building_floors: asText(listing.building_floors),
    year_built: asText(listing.year_built),
    description: listing.description ?? '',
    pin: [listing.longitude, listing.latitude],
  };
}
