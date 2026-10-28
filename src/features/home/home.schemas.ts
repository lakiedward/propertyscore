import { z } from 'zod';

export const homeSearchSchema = z.object({
  transaction: z.enum(['sale', 'rent']).optional().catch(undefined),
  deliverable: z.enum(['report', 'zone', 'visual']).optional().catch(undefined),
});

export type HomeSearch = z.infer<typeof homeSearchSchema>;
