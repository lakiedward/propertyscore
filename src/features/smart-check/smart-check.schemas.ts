import { z } from 'zod';
import { shareTokenSchema } from './report.schemas';

export const CHECK_STEPS = ['address', 'confirm', 'details', 'payment', 'done'] as const;

export const checkSearchSchema = z.object({
  step: z.enum(CHECK_STEPS).optional().catch(undefined),
});

export const reportSearchSchema = z.object({
  share: shareTokenSchema.optional().catch(undefined),
});
