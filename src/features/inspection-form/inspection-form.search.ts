import { z } from 'zod';
import { CONSENT_LANGUAGES, CONTENT_TABS } from './inspection-form.types';

export const contentSearchSchema = z.object({
  tab: z.enum(CONTENT_TABS).catch('consent').default('consent'),
  category: z.string().max(40).optional().catch(undefined),
  lang: z.enum(CONSENT_LANGUAGES).catch('ro').default('ro'),
});
