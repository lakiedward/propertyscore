import type { Sql } from '../db/sql.ts';
import type { Logger } from '../lib/logger.ts';
import type { CoveredCity } from '../snapshot/snapshot.db.ts';
import type { CategoryKey } from './categories.ts';

type ScoreContext = {
  sql: Sql;
  snapshotId: string;
  period: string;
  cellSizeM: number;
  cities: readonly CoveredCity[];
  params: unknown;
  sourcesDir: string;
  osmExtractUrl: string;
  logger: Logger;
};

type ScoreModuleResult = {
  sourceDates: Record<string, string>;
};

export type ScoreModule = {
  key: CategoryKey;
  run: (context: ScoreContext) => Promise<ScoreModuleResult>;
};
