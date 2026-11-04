import { z } from 'zod';

import { WorkerError } from '../../lib/errors.ts';

const codeSchema = z.string().regex(/^[a-z][a-z0-9_]{0,79}$/);

const questionsParamsSchema = z.object({
  always: z.array(codeSchema),
  unknown_construction_year: codeSchema,
  stairs: z.object({ min_floor: z.int().min(1).max(60), code: codeSchema }),
  ground_floor: codeSchema,
  top_floor: codeSchema,
});

export type QuestionsParams = z.infer<typeof questionsParamsSchema>;

export function parseQuestionsParams(value: unknown): QuestionsParams {
  const parsed = questionsParamsSchema.safeParse(value);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError('invalid_questions_params', `Invalid params.questions: ${fields}`);
  }
  return parsed.data;
}
