import type { Sql } from '../db/sql.ts';
import type { Logger } from '../lib/logger.ts';
import type { ValhallaClient } from '../routing/valhalla.ts';
import type { CoveredCity } from '../snapshot/snapshot.db.ts';
import type { OsmExtractSource } from '../sources/osm.ts';
import type { CategoryKey } from './categories.ts';

export type ScoreContext = {
  sql: Sql;
  snapshotId: string;
  period: string;
  cellSizeM: number;
  cities: readonly CoveredCity[];
  params: unknown;
  sourcesDir: string;
  osmExtract: OsmExtractSource;
  router: ValhallaClient | null;
  logger: Logger;
};

type ScoreModuleResult = {
  sourceDates: Record<string, string>;
};

export type ScoreModule = {
  key: CategoryKey;
  run: (context: ScoreContext) => Promise<ScoreModuleResult>;
};
