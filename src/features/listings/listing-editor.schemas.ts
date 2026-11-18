import { z } from 'zod';
import { EDITOR_SECTIONS } from './listing-editor.sections';

export const listingEditorSearchSchema = z.object({
  section: z.enum(EDITOR_SECTIONS).optional().catch(undefined),
});
