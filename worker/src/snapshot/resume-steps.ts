import type { JsonObject } from '../db/sql.ts';
import { WorkerError } from '../lib/errors.ts';
import type { createSnapshotJournal } from './resume-journal.ts';

type Journal = ReturnType<typeof createSnapshotJournal>;
export type StepJournal = Pick<Journal, 'beginRequest' | 'acceptRequest' | 'finishRequest'>;

type SnapshotStep = {
  key: string;
  run: (journal: StepJournal, signal: AbortSignal) => Promise<JsonObject>;
};

export async function runMissingSnapshotSteps(
  steps: readonly SnapshotStep[],
  journal: Journal,
  signal: AbortSignal,
) {
  const completed = await journal.completedSteps();
  const results = new Map<string, JsonObject>();
  for (const step of steps) {
    signal.throwIfAborted();
    const known = completed.get(step.key);
    if (known !== undefined) {
      results.set(step.key, known);
      continue;
    }
    await journal.claimStep(step.key);
    const result = await step.run(journal, signal);
    signal.throwIfAborted();
    await journal.completeStep(step.key, result);
    results.set(step.key, result);
  }
  if (await journal.hasPendingSteps()) {
    throw new WorkerError('snapshot_steps_missing', 'Not every Smart Check step was completed');
  }
  return results;
}
