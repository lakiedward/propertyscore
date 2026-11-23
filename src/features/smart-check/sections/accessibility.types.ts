import type { z } from 'zod';
import type { accessibilitySectionSchema } from './accessibility.schemas';

export type AccessibilitySection = z.infer<typeof accessibilitySectionSchema>;
