import { z } from 'zod';
import { formatNumber, parseLocaleNumber } from '@/i18n/format';
import { messageKey, validationMessage } from '@/i18n/validation';
import { REPORT_TABS } from './report-chapter-meta';
import { shareTokenSchema } from './report.schemas';

export const CHECK_STEPS = ['address', 'confirm', 'details', 'payment', 'done'] as const;

export type CheckStep = (typeof CHECK_STEPS)[number];

export const ADDRESS_MIN_LENGTH = 3;
const ADDRESS_MAX_LENGTH = 300;

const DETAIL_LIMITS = {
  rooms: { min: 1, max: 20, isInteger: true },
  area: { min: 1, max: 9999, isInteger: false },
  floor: { min: -2, max: 60, isInteger: true },
  floors: { min: 1, max: 60, isInteger: true },
  year: { min: 1800, max: 2100, isInteger: true },
} as const;

type DetailNumber = keyof typeof DETAIL_LIMITS;

function optionalSearchNumber(name: DetailNumber) {
  const { min, max, isInteger } = DETAIL_LIMITS[name];
  const base = z.number().min(min).max(max);
  return (isInteger ? base.int() : base).optional().catch(undefined);
}

export const checkSearchSchema = z.object({
  step: z.enum(CHECK_STEPS).optional().catch(undefined),
  address: z.string().trim().min(1).max(ADDRESS_MAX_LENGTH).optional().catch(undefined),
  lat: z.number().min(-90).max(90).optional().catch(undefined),
  lng: z.number().min(-180).max(180).optional().catch(undefined),
  rooms: optionalSearchNumber('rooms'),
  area: optionalSearchNumber('area'),
  floor: optionalSearchNumber('floor'),
  floors: optionalSearchNumber('floors'),
  elevator: z.enum(['yes', 'no']).optional().catch(undefined),
  year: optionalSearchNumber('year'),
  report: z.uuid().optional().catch(undefined),
});

export type CheckSearch = z.infer<typeof checkSearchSchema>;

export const reportSearchSchema = z.object({
  share: shareTokenSchema.optional().catch(undefined),
  chapter: z.enum(REPORT_TABS).optional().catch(undefined),
});

function localeNumber(name: DetailNumber) {
  const { min, max, isInteger } = DETAIL_LIMITS[name];
  return z.string().superRefine((input, context) => {
    if (input.trim() === '') {
      return;
    }
    const value = parseLocaleNumber(input);
    if (value === undefined || (isInteger && !Number.isInteger(value))) {
      context.addIssue({ code: 'custom', message: validationMessage('number') });
    } else if (value < min) {
      context.addIssue({ code: 'custom', message: validationMessage('min', { min }) });
    } else if (value > max) {
      context.addIssue({ code: 'custom', message: validationMessage('max', { max }) });
    }
  });
}

export const checkDetailsFormSchema = z
  .object({
    rooms: localeNumber('rooms'),
    area: localeNumber('area'),
    floor: localeNumber('floor'),
    floors: localeNumber('floors'),
    elevator: z.union([z.literal(''), z.enum(['yes', 'no', 'unknown'])]),
    year: localeNumber('year'),
  })
  .refine(
    (values) => {
      const floor = parseLocaleNumber(values.floor);
      const floors = parseLocaleNumber(values.floors);
      return floor === undefined || floors === undefined || floor <= floors;
    },
    { path: ['floor'], message: messageKey('common:errors.reasons.listing_floor_above_building') },
  );

export type CheckDetailsFormValues = z.infer<typeof checkDetailsFormSchema>;

export type CheckDetailsSearch = Pick<
  CheckSearch,
  'rooms' | 'area' | 'floor' | 'floors' | 'elevator' | 'year'
>;

function toNumber(input: string): number | undefined {
  return input.trim() === '' ? undefined : parseLocaleNumber(input);
}

export function toDetailsSearch(values: CheckDetailsFormValues): CheckDetailsSearch {
  return {
    rooms: toNumber(values.rooms),
    area: toNumber(values.area),
    floor: toNumber(values.floor),
    floors: toNumber(values.floors),
    elevator: values.elevator === 'yes' || values.elevator === 'no' ? values.elevator : undefined,
    year: toNumber(values.year),
  };
}

function toInput(value: number | undefined): string {
  return value === undefined
    ? ''
    : formatNumber(value, { useGrouping: false, maximumFractionDigits: 2 });
}

export function toDetailsFormValues(search: CheckDetailsSearch): CheckDetailsFormValues {
  return {
    rooms: toInput(search.rooms),
    area: toInput(search.area),
    floor: toInput(search.floor),
    floors: toInput(search.floors),
    elevator: search.elevator ?? '',
    year: toInput(search.year),
  };
}

export type CheckOrder = CheckDetailsSearch & {
  address: string;
  latitude: number;
  longitude: number;
  locale: string;
};
