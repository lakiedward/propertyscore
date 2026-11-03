import type { JsonObject, Sql } from '../db/sql.ts';
import type { Logger } from '../lib/logger.ts';
import type { ValhallaClient } from '../routing/valhalla.ts';
import type { CategoryKey, ContextKey } from '../scoring/categories.ts';

type ReportSectionContext = {
  sql: Sql;
  reportId?: string;
  snapshotId: string;
  cellId: string;
  citySlug: string;
  latitude: number;
  longitude: number;
  params: unknown;
  logger: Logger;
  router?: ValhallaClient | null;
};

export type ReportSection = {
  key: CategoryKey | ContextKey;
  build: (context: ReportSectionContext) => Promise<JsonObject | null>;
};
