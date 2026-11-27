import { z } from 'zod';
import { SUPPORTED_LOCALES } from '@/i18n/i18n';
import { CONTENT_TABS } from './inspection-form.types';

export const contentSearchSchema = z.object({
  tab: z.enum(CONTENT_TABS).catch('consent').default('consent'),
  category: z.string().max(40).optional().catch(undefined),
  lang: z.enum(SUPPORTED_LOCALES).catch('ro').default('ro'),
  version: z.uuid().optional().catch(undefined),
});
