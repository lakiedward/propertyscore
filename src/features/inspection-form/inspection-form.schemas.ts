import { z } from 'zod';
import { CATEGORY_ICON_KEYS } from '@/components/inspection/category-icons';
import { REQUIRED_MEDIA } from './inspection-form.types';

const CATEGORY_NAME_MAX = 60;

const QUESTION_TEXT_MAX = 300;

export const categorySchema = z.object({
  nameRo: z.string().trim().min(1).max(CATEGORY_NAME_MAX),
  nameEn: z.string().trim().max(CATEGORY_NAME_MAX),
  icon: z.enum(CATEGORY_ICON_KEYS),
});

export type CategoryValues = z.infer<typeof categorySchema>;

export const questionSchema = z.object({
  textRo: z.string().max(QUESTION_TEXT_MAX),
  textEn: z.string().max(QUESTION_TEXT_MAX),
  requiredMedia: z.enum(REQUIRED_MEDIA),
});

export type QuestionValues = z.infer<typeof questionSchema>;

const pointSchema = z.number().min(0).max(10);

export const pointsSchema = z
  .object({ good: pointSchema, acceptable: pointSchema, problem: pointSchema })
  .refine((points) => points.good >= points.acceptable && points.acceptable >= points.problem, {
    path: ['acceptable'],
    message: 'invalid',
  });

export type PointsValues = z.infer<typeof pointsSchema>;

const CONSENT_TITLE_MAX = 120;

const CONSENT_TEXT_MAX = 3000;

const CONSENT_CHECK_MAX = 200;

const consentSectionSchema = z.object({
  id: z.string(),
  title_ro: z.string().max(CONSENT_TITLE_MAX),
  title_en: z.string().max(CONSENT_TITLE_MAX),
  text_ro: z.string().max(CONSENT_TEXT_MAX),
  text_en: z.string().max(CONSENT_TEXT_MAX),
  check_ro: z.string().max(CONSENT_CHECK_MAX),
  check_en: z.string().max(CONSENT_CHECK_MAX),
});

export const consentSectionsSchema = z.object({ sections: z.array(consentSectionSchema) });

export type ConsentSectionsValues = z.infer<typeof consentSectionsSchema>;
