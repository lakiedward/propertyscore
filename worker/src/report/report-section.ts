import type { JsonObject, Sql, SqlQueries } from '../db/sql.ts';
import type { Logger } from '../lib/logger.ts';
import type { ValhallaClient } from '../routing/valhalla.ts';
import type { CategoryKey, ContextKey } from '../scoring/categories.ts';
import type { EarthquakeCatalog } from '../scoring/seismic/earthquake-catalog.ts';

type ReportSectionContext = {
  sql: Sql;
  registrySql?: SqlQueries;
  reportId?: string;
  snapshotId: string;
  cellId: string;
  citySlug: string;
  latitude: number;
  longitude: number;
  params: unknown;
  logger: Logger;
  router?: ValhallaClient | null;
  earthquakes?: EarthquakeCatalog | null;
};

export type ReportSection = {
  key: CategoryKey | ContextKey;
  build: (context: ReportSectionContext) => Promise<JsonObject | null>;
  addressScore?: (section: JsonObject) => number | null;
};
