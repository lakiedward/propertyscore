import { z } from 'zod';
import { messageKey, validationMessage } from '@/i18n/validation';
import { Constants } from '@/lib/supabase/database.types';

export const inspectorCitySchema = z.object({
  cityId: z.string().min(1),
});

export type InspectorCityValues = z.infer<typeof inspectorCitySchema>;

const timeRangeSchema = z.object({
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
});

export const WEEKLY_RANGES_MAX = 4;

export const weeklyHoursSchema = z
  .object({
    ranges: z.array(timeRangeSchema).max(WEEKLY_RANGES_MAX),
  })
  .superRefine(({ ranges }, context) => {
    ranges.forEach((range, index) => {
      if (range.startsAt >= range.endsAt) {
        context.addIssue({
          code: 'custom',
          path: ['ranges', index, 'endsAt'],
          message: messageKey('common:validation.endAfterStart'),
        });
        return;
      }
      const overlaps = ranges.some(
        (other, otherIndex) =>
          otherIndex !== index && range.startsAt < other.endsAt && other.startsAt < range.endsAt,
      );
      if (overlaps) {
        context.addIssue({
          code: 'custom',
          path: ['ranges', index, 'startsAt'],
          message: messageKey('common:validation.rangesOverlap'),
        });
      }
    });
  });

export type WeeklyHoursValues = z.infer<typeof weeklyHoursSchema>;

export const EXCEPTION_NOTE_MAX = 120;

export const exceptionFormSchema = z
  .object({
    kind: z.enum(Constants.public.Enums.inspector_exception_kind),
    fromDate: z.iso.date(validationMessage('required')),
    toDate: z.iso.date(validationMessage('required')),
    isAllDay: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    note: z
      .string()
      .trim()
      .max(EXCEPTION_NOTE_MAX, validationMessage('maxLength', { count: EXCEPTION_NOTE_MAX })),
  })
  .superRefine((values, context) => {
    if (values.toDate < values.fromDate) {
      context.addIssue({
        code: 'custom',
        path: ['toDate'],
        message: messageKey('common:validation.endAfterStart'),
      });
      return;
    }
    if (
      !values.isAllDay &&
      `${values.toDate}T${values.endTime}` <= `${values.fromDate}T${values.startTime}`
    ) {
      context.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: messageKey('common:validation.endAfterStart'),
      });
    }
  });

export type ExceptionFormValues = z.infer<typeof exceptionFormSchema>;
