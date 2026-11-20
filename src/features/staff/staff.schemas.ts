import { z } from 'zod';

export const inspectorCitySchema = z.object({
  cityId: z.string().min(1),
});

export type InspectorCityValues = z.infer<typeof inspectorCitySchema>;
