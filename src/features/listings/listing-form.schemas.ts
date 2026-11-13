import { z } from 'zod';
import { formatNumber, parseLocaleNumber } from '@/i18n/format';
import { messageKey, validationMessage } from '@/i18n/validation';
import type { Tables, TablesInsert } from '@/lib/supabase/database.types';
import {
  BUILDING_SERVICES,
  BUILDING_TYPES,
  COMFORTS,
  COOLINGS,
  FURNISHINGS,
  HEATINGS,
  heatingsFor,
  HOUSE_TYPES,
  INTERIOR_CONDITIONS,
  PARTITIONINGS,
  PETS,
  POOLS,
  PROPERTY_TYPES,
  UTILITIES,
  utilitiesFor,
  YARDS,
} from './listing-property.options';

const CURRENT_YEAR = new Date().getFullYear();

export const LISTING_TITLE_MAX = 70;

export const LISTING_DESCRIPTION_MAX = 3000;

export const LISTING_MIN_PHOTOS = 5;
export const LISTING_MAX_PHOTOS = 20;

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

function optionalChoice<const T extends readonly [string, ...string[]]>(values: T) {
  return z.union([z.literal(''), z.enum(values)]);
}

function requiredWhen(isRequired: boolean, value: string): boolean {
  return !isRequired || value.trim() !== '';
}

export const listingFormSchema = z
  .object({
    property_type: z.enum(PROPERTY_TYPES),
    transaction: z.enum(['sale', 'rent']),
    title: z.string().trim().min(1).max(LISTING_TITLE_MAX),
    city: z.string().trim().min(1).max(80),
    street_label: z.string().trim().min(1).max(120),
    rooms: localeNumber({ min: 1, max: 20, isInteger: true, isRequired: true }),
    area_m2: localeNumber({ min: 1, max: 99_999, isRequired: true }),
    price: localeNumber({ min: 1, max: 9_999_999_999, isRequired: true }),
    currency: z.enum(['EUR', 'RON']),
    floor: localeNumber({ min: -1, max: 80, isInteger: true, isRequired: false }),
    bathrooms: localeNumber({ min: 1, max: 10, isInteger: true, isRequired: false }),
    partitioning: optionalChoice(PARTITIONINGS),
    comfort: optionalChoice(COMFORTS),
    building_type: optionalChoice(BUILDING_TYPES),
    house_type: optionalChoice(HOUSE_TYPES),
    land_area_m2: localeNumber({ min: 1, max: 1_000_000, isRequired: false }),
    has_basement: z.boolean(),
    has_semibasement: z.boolean(),
    has_attic: z.boolean(),
    interior_condition: optionalChoice(INTERIOR_CONDITIONS),
    heating: optionalChoice(HEATINGS),
    cooling: optionalChoice(COOLINGS),
    furnishing: optionalChoice(FURNISHINGS),
    pets: optionalChoice(PETS),
    is_passive_house: z.boolean(),
    balconies: localeNumber({ min: 0, max: 20, isInteger: true, isRequired: false }),
    parking_spaces: localeNumber({ min: 0, max: 20, isInteger: true, isRequired: false }),
    utilities: z.array(z.enum(UTILITIES)),
    building_services: z.array(z.enum(BUILDING_SERVICES)),
    has_elevator: z.boolean(),
    has_shared_yard: z.boolean(),
    pool: optionalChoice(POOLS),
    yard: optionalChoice(YARDS),
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
  .refine((values) => requiredWhen(values.property_type === 'apartment', values.floor), {
    path: ['floor'],
    message: validationMessage('required'),
  })
  .refine((values) => requiredWhen(values.property_type === 'house', values.house_type), {
    path: ['house_type'],
    message: validationMessage('required'),
  })
  .refine((values) => requiredWhen(values.property_type === 'house', values.land_area_m2), {
    path: ['land_area_m2'],
    message: validationMessage('required'),
  })
  .refine(
    (values) => {
      if (values.property_type !== 'apartment') {
        return true;
      }
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

type DetailColumn =
  | 'property_type'
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
  | 'yard';

export type ListingWrite = Required<Pick<TablesInsert<'listings'>, DetailColumn>>;

type StoredListing = Pick<Tables<'listings'>, Exclude<DetailColumn, 'transaction'>> & {
  transaction: 'sale' | 'rent';
};

function optionalNumber(input: string): number | null {
  return input.trim() === '' ? null : (parseLocaleNumber(input) ?? null);
}

function requiredNumber(input: string): number {
  return parseLocaleNumber(input) ?? 0;
}

function choice<T extends string>(value: T | ''): T | null {
  return value === '' ? null : value;
}

export function toListingWrite(values: ListingFormValues): ListingWrite {
  const [longitude, latitude] = values.pin ?? [0, 0];
  const description = values.description.trim();
  const isApartment = values.property_type === 'apartment';
  const isHouse = values.property_type === 'house';
  const heating = choice(values.heating);
  return {
    property_type: values.property_type,
    transaction: values.transaction,
    title: values.title.trim(),
    city: values.city.trim(),
    street_label: values.street_label.trim(),
    rooms: requiredNumber(values.rooms),
    area_m2: requiredNumber(values.area_m2),
    price: requiredNumber(values.price),
    currency: values.currency,
    floor: isApartment ? optionalNumber(values.floor) : null,
    building_floors: optionalNumber(values.building_floors),
    year_built: optionalNumber(values.year_built),
    description: description === '' ? null : description,
    latitude,
    longitude,
    bathrooms: optionalNumber(values.bathrooms),
    partitioning: isApartment ? choice(values.partitioning) : null,
    comfort: isApartment ? choice(values.comfort) : null,
    building_type: isApartment ? choice(values.building_type) : null,
    house_type: isHouse ? choice(values.house_type) : null,
    land_area_m2: isHouse ? optionalNumber(values.land_area_m2) : null,
    has_basement: isHouse && values.has_basement,
    has_semibasement: isHouse && values.has_semibasement,
    has_attic: isHouse && values.has_attic,
    interior_condition: choice(values.interior_condition),
    heating: heating && heatingsFor(values.property_type).includes(heating) ? heating : null,
    cooling: choice(values.cooling),
    furnishing: choice(values.furnishing),
    pets: values.transaction === 'rent' ? choice(values.pets) : null,
    is_passive_house: isHouse && values.is_passive_house,
    balconies: optionalNumber(values.balconies),
    parking_spaces: optionalNumber(values.parking_spaces),
    utilities: values.utilities.filter((utility) =>
      utilitiesFor(values.property_type).includes(utility),
    ),
    building_services: [...values.building_services],
    has_elevator: isApartment && values.has_elevator,
    has_shared_yard: isApartment && values.has_shared_yard,
    pool: isHouse ? choice(values.pool) : null,
    yard: isHouse ? choice(values.yard) : null,
  };
}

function asText(value: number | null): string {
  return value === null
    ? ''
    : formatNumber(value, { useGrouping: false, maximumFractionDigits: 2 });
}

export function toListingFormValues(listing: StoredListing | null): ListingFormValues {
  if (!listing) {
    return {
      property_type: 'apartment',
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
      bathrooms: '',
      partitioning: '',
      comfort: '',
      building_type: '',
      house_type: '',
      land_area_m2: '',
      has_basement: false,
      has_semibasement: false,
      has_attic: false,
      interior_condition: '',
      heating: '',
      cooling: '',
      furnishing: '',
      pets: '',
      is_passive_house: false,
      balconies: '',
      parking_spaces: '',
      utilities: [],
      building_services: [],
      has_elevator: false,
      has_shared_yard: false,
      pool: '',
      yard: '',
    };
  }
  return {
    property_type: listing.property_type,
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
    bathrooms: asText(listing.bathrooms),
    partitioning: listing.partitioning ?? '',
    comfort: listing.comfort ?? '',
    building_type: listing.building_type ?? '',
    house_type: listing.house_type ?? '',
    land_area_m2: asText(listing.land_area_m2),
    has_basement: listing.has_basement,
    has_semibasement: listing.has_semibasement,
    has_attic: listing.has_attic,
    interior_condition: listing.interior_condition ?? '',
    heating: listing.heating ?? '',
    cooling: listing.cooling ?? '',
    furnishing: listing.furnishing ?? '',
    pets: listing.pets ?? '',
    is_passive_house: listing.is_passive_house,
    balconies: asText(listing.balconies),
    parking_spaces: asText(listing.parking_spaces),
    utilities: [...listing.utilities],
    building_services: [...listing.building_services],
    has_elevator: listing.has_elevator,
    has_shared_yard: listing.has_shared_yard,
    pool: listing.pool ?? '',
    yard: listing.yard ?? '',
  };
}
