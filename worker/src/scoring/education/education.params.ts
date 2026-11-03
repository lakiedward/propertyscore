import { z } from 'zod';

const levelSchema = z
  .object({
    full_min: z.number().positive(),
    zero_min: z.number().positive(),
    weight: z.number().min(0),
  })
  .refine((level) => level.zero_min > level.full_min, {
    message: 'zero_min must be greater than full_min',
  });

export const SCORED_LEVELS = ['kindergarten', 'school', 'high_school'] as const;

export type ScoredLevel = (typeof SCORED_LEVELS)[number];

export const SCORED_LEVEL_CATEGORY: Record<ScoredLevel, string> = {
  kindergarten: 'education_kindergarten',
  school: 'education_school',
  high_school: 'education_high_school',
};

export const educationParamsSchema = z.object({
  levels: z.object({
    kindergarten: levelSchema,
    school: levelSchema,
    high_school: levelSchema,
  }),
  choice_weight: z.number().min(0).max(1),
  neighbour_weight: z.number().min(0).max(1),
  walk_speed_kmh: z.number().positive().max(10),
  walk_detour_factor: z.number().min(1).max(3),
  max_candidates: z.number().int().min(2).max(50),
  count_bands_min: z.array(z.number().positive()).min(1).max(5),
  require_official_register: z.boolean(),
  register: z.object({
    school_year: z.string().regex(/^\d{4}-\d{4}$/),
    url: z.url(),
    cities: z.record(
      z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
      z.array(z.number().int().positive()).min(1),
    ),
  }),
  match: z.object({
    radius_m: z.number().positive().max(2000),
    min_similarity: z.number().min(0).max(1),
    name_only_similarity: z.number().min(0).max(1),
  }),
});

export type EducationParams = z.infer<typeof educationParamsSchema>;

export type LevelParams = EducationParams['levels'][ScoredLevel];
