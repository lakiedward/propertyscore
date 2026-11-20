import { z } from 'zod';
import { parseLocaleNumber } from '@/i18n/format';
import { messageKey, validationMessage } from '@/i18n/validation';
import { isPhoneNumber, toE164Phone } from '@/lib/phone';
import { Constants } from '@/lib/supabase/database.types';
import { ACCESS_TAGS, type AccessTag, type PropertyType } from './inspection.types';

export const ADDRESS_MAX = 200;
export const ACCESS_NOTES_MAX = 500;
const AREA_MIN = 10;
const AREA_MAX = 2000;
const YEAR_MIN = 1800;
const FLOOR_MIN = -1;
const FLOOR_MAX = 80;

function parsedInteger(value: string): number | undefined {
  const parsed = parseLocaleNumber(value);
  return parsed !== undefined && Number.isInteger(parsed) ? parsed : undefined;
}

export const homeFormSchema = z
  .object({
    addressText: z
      .string()
      .trim()
      .min(1, validationMessage('required'))
      .max(ADDRESS_MAX, validationMessage('maxLength', { count: ADDRESS_MAX })),
    cityId: z.string().min(1, validationMessage('required')),
    pin: z.object({ lng: z.number(), lat: z.number() }).nullable(),
    propertyType: z.enum(Constants.public.Enums.listing_property_type),
    areaM2: z.string(),
    yearBuilt: z.string(),
    floor: z.string(),
    buildingFloors: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.pin) {
      context.addIssue({
        code: 'custom',
        path: ['pin'],
        message: messageKey('common:validation.pinRequired'),
      });
    }
    const area = parseLocaleNumber(values.areaM2);
    if (values.areaM2.trim() === '') {
      context.addIssue({
        code: 'custom',
        path: ['areaM2'],
        message: validationMessage('required'),
      });
    } else if (area === undefined) {
      context.addIssue({ code: 'custom', path: ['areaM2'], message: validationMessage('number') });
    } else if (area < AREA_MIN || area > AREA_MAX) {
      context.addIssue({
        code: 'custom',
        path: ['areaM2'],
        message: validationMessage(area < AREA_MIN ? 'min' : 'max', {
          min: AREA_MIN,
          max: AREA_MAX,
        }),
      });
    }
    if (values.yearBuilt.trim() !== '') {
      const year = parsedInteger(values.yearBuilt);
      const lastYear = new Date().getFullYear();
      if (year === undefined || year < YEAR_MIN || year > lastYear) {
        context.addIssue({
          code: 'custom',
          path: ['yearBuilt'],
          message: messageKey('common:validation.range', { min: YEAR_MIN, max: lastYear }),
        });
      }
    }
    if (values.propertyType !== 'apartment') {
      return;
    }
    const floor = parsedInteger(values.floor);
    const buildingFloors = parsedInteger(values.buildingFloors);
    if (floor === undefined || floor < FLOOR_MIN || floor > FLOOR_MAX) {
      context.addIssue({
        code: 'custom',
        path: ['floor'],
        message:
          values.floor.trim() === ''
            ? validationMessage('required')
            : messageKey('common:validation.range', { min: FLOOR_MIN, max: FLOOR_MAX }),
      });
    }
    if (buildingFloors === undefined || buildingFloors < 0 || buildingFloors > FLOOR_MAX) {
      context.addIssue({
        code: 'custom',
        path: ['buildingFloors'],
        message:
          values.buildingFloors.trim() === ''
            ? validationMessage('required')
            : messageKey('common:validation.range', { min: 0, max: FLOOR_MAX }),
      });
    } else if (floor !== undefined && floor > buildingFloors) {
      context.addIssue({
        code: 'custom',
        path: ['floor'],
        message: messageKey('common:validation.floorAboveBuilding'),
      });
    }
  });

export type HomeFormValues = z.infer<typeof homeFormSchema>;

export type BookingHome = {
  addressText: string;
  cityId: string;
  latitude: number;
  longitude: number;
  propertyType: PropertyType;
  areaM2: number;
  yearBuilt: number | null;
  floor: number | null;
  buildingFloors: number | null;
};

export function toBookingHome(values: HomeFormValues): BookingHome | null {
  const area = parseLocaleNumber(values.areaM2);
  if (!values.pin || area === undefined) {
    return null;
  }
  const isApartment = values.propertyType === 'apartment';
  return {
    addressText: values.addressText.trim(),
    cityId: values.cityId,
    latitude: values.pin.lat,
    longitude: values.pin.lng,
    propertyType: values.propertyType,
    areaM2: area,
    yearBuilt: parsedInteger(values.yearBuilt) ?? null,
    floor: isApartment ? (parsedInteger(values.floor) ?? null) : null,
    buildingFloors: isApartment ? (parsedInteger(values.buildingFloors) ?? null) : null,
  };
}

export function toHomeFormValues(home: BookingHome | null, fallbackCityId: string): HomeFormValues {
  return {
    addressText: home?.addressText ?? '',
    cityId: home?.cityId ?? fallbackCityId,
    pin: home ? { lng: home.longitude, lat: home.latitude } : null,
    propertyType: home?.propertyType ?? 'apartment',
    areaM2: home ? String(home.areaM2) : '',
    yearBuilt: home?.yearBuilt === null || !home ? '' : String(home.yearBuilt),
    floor: home?.floor === null || !home ? '' : String(home.floor),
    buildingFloors: home?.buildingFloors === null || !home ? '' : String(home.buildingFloors),
  };
}

export const accessFormSchema = z
  .object({
    mode: z.enum(Constants.public.Enums.inspection_access_mode),
    name: z.string().trim(),
    phone: z.string().trim(),
    tags: z.array(z.enum(ACCESS_TAGS)),
    notes: z
      .string()
      .trim()
      .max(ACCESS_NOTES_MAX, validationMessage('maxLength', { count: ACCESS_NOTES_MAX })),
  })
  .superRefine((values, context) => {
    if (values.mode !== 'other') {
      return;
    }
    if (values.name === '') {
      context.addIssue({ code: 'custom', path: ['name'], message: validationMessage('required') });
    }
    if (values.phone === '') {
      context.addIssue({ code: 'custom', path: ['phone'], message: validationMessage('required') });
    } else if (!isPhoneNumber(values.phone)) {
      context.addIssue({
        code: 'custom',
        path: ['phone'],
        message: messageKey('common:validation.phone'),
      });
    }
  });

export type AccessFormValues = z.infer<typeof accessFormSchema>;

export type BookingAccess = {
  mode: AccessFormValues['mode'];
  name: string | null;
  phone: string | null;
  tags: AccessTag[];
  notes: string | null;
};

export function toBookingAccess(values: AccessFormValues): BookingAccess {
  const isOther = values.mode === 'other';
  return {
    mode: values.mode,
    name: isOther ? values.name : null,
    phone: isOther ? toE164Phone(values.phone) : null,
    tags: values.tags,
    notes: values.notes === '' ? null : values.notes,
  };
}

export const paymentFormSchema = z.object({
  paymentMethod: z.enum(Constants.public.Enums.inspection_payment_method),
  hasAcceptedTerms: z.boolean().refine(Boolean, messageKey('common:validation.termsRequired')),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
