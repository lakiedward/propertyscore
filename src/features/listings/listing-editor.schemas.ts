import { z } from 'zod';
import { WIZARD_STEPS } from './listing-wizard.steps';

export const listingEditorSearchSchema = z.object({
  step: z.number().int().min(1).max(WIZARD_STEPS.length).default(1).catch(1),
});
