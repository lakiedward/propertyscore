import { parseArgs } from 'node:util';

import { WorkerError } from './lib/errors.ts';
import { CATEGORY_KEYS, type CategoryKey } from './scoring/categories.ts';

export type BuildSnapshotCommand = {
  command: 'build-snapshot';
  period: string;
  citySlugs: string[];
  scoreKeys: CategoryKey[];
};

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

function isCategoryKey(value: string): value is CategoryKey {
  return CATEGORY_KEYS.some((key) => key === value);
}

export function currentPeriod(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function parseCommand(argv: readonly string[], now: Date): BuildSnapshotCommand {
  const { positionals, values } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      period: { type: 'string' },
      city: { type: 'string', multiple: true },
      score: { type: 'string', multiple: true },
    },
  });

  const [command] = positionals;
  if (command !== 'build-snapshot') {
    throw new WorkerError('unknown_command', `Unknown command: ${command ?? '(none)'}`);
  }

  const period = values.period ?? currentPeriod(now);
  if (!PERIOD.test(period)) {
    throw new WorkerError('invalid_period', `Period must be YYYY-MM, got ${period}`);
  }

  const scoreKeys = values.score ?? [];
  const unknownScores = scoreKeys.filter((key) => !isCategoryKey(key));
  if (unknownScores.length > 0) {
    throw new WorkerError('invalid_score', `Unknown score: ${unknownScores.join(', ')}`);
  }

  return {
    command,
    period: `${period}-01`,
    citySlugs: values.city ?? [],
    scoreKeys: scoreKeys.filter(isCategoryKey),
  };
}
