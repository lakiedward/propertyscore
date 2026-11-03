import type { JsonObject, Sql } from '../db/sql.ts';
import type { Logger } from '../lib/logger.ts';
import type { CategoryKey } from '../scoring/categories.ts';

export type ReportSectionContext = {
  sql: Sql;
  snapshotId: string;
  cellId: string;
  citySlug: string;
  latitude: number;
  longitude: number;
  params: unknown;
  logger: Logger;
};

export type ReportSection = {
  key: CategoryKey;
  build: (context: ReportSectionContext) => Promise<JsonObject | null>;
};
