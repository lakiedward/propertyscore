import { z } from 'zod';

export const questionsSectionSchema = z.object({
  codes: z.array(z.string()),
});
