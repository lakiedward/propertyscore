import { z } from 'zod';
import { PUBLISH_STEP_KEYS } from './publish.steps';

export const publishSearchSchema = z.object({
  step: z.enum(PUBLISH_STEP_KEYS).optional().catch(undefined),
});
