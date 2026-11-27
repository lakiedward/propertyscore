import { z } from 'zod';

export const progressSchema = z.object({
  answered: z.number(),
  total: z.number(),
  photos: z.number(),
  videos: z.number(),
  missing_media: z.number(),
  score: z.number().nullable(),
  categories: z.array(
    z.object({
      category_id: z.string(),
      answered: z.number(),
      total: z.number(),
      score: z.number().nullable(),
    }),
  ),
});

const OWNER_NAME_MAX = 120;

export const ownerConfirmSchema = z.object({
  ownerName: z.string().trim().min(1).max(OWNER_NAME_MAX),
});

export type OwnerConfirmValues = z.infer<typeof ownerConfirmSchema>;

export const NOTE_MAX = 2000;
