import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';

import type { Sql } from '../../db/sql.ts';
import { createLazyGeocoder, loadCityGeocoder } from '../../geocoding/city-geocoder.ts';
import { errorCode } from '../../lib/errors.ts';
import type { Logger } from '../../lib/logger.ts';
import { listCoveredCities, type CoveredCity } from '../../snapshot/snapshot.db.ts';
import { downloadOsmExtract, type OsmExtractSource } from '../../sources/osm.ts';
import { replaceCnasProviders, syncEmergencyHospitals } from './health.db.ts';
import {
  CNAS_LIST_COLUMNS,
  cnasListEntries,
  EMERGENCY_COLUMNS,
  emergencyRow,
  extractCnasProviders,
  placeEmergencyRows,
  groupCnasLists,
  readCsvFile,
  readProviderTable,
  type EmergencyRow,
} from './health.import.ts';
import type { Point } from './health.sources.ts';

export type ImportHealthSourcesInput = {
  sql: Sql;
  dir: string;
  citySlugs: readonly string[];
  validFrom: string;
  period: string;
  sourcesDir: string;
  osmExtract: OsmExtractSource;
  logger: Logger;
};

export type ImportHealthSourcesResult = {
  cnasLists: number;
  cnasProviders: number;
  emergencyCities: number;
};

async function importCnasLists(
  input: ImportHealthSourcesInput,
  city: CoveredCity,
): Promise<{ lists: number; providers: number }> {
  const cityDir = join(input.dir, 'cnas', city.slug);
  const indexPath = join(cityDir, 'surse.csv');
  if (!existsSync(indexPath)) {
    input.logger.warn('cnas lists missing', { city: city.slug });
    return { lists: 0, providers: 0 };
  }
  const { entries, skipped } = cnasListEntries(await readCsvFile(indexPath, CNAS_LIST_COLUMNS));
  if (skipped > 0) input.logger.warn('cnas index rows skipped', { city: city.slug, skipped });

  let lists = 0;
  let providers = 0;
  for (const group of groupCnasLists(entries)) {
    const seen = new Set<string>();
    const rows: { name: string; address: string | null }[] = [];
    const counts = { skipped_outside_city: 0, skipped_duplicate: 0, files_read: 0 };
    for (const entry of group.files) {
      const file = basename(entry);
      const log = { city: city.slug, file, kind: group.kind, list_date: group.listDate };
      let table: Awaited<ReturnType<typeof readProviderTable>>;
      try {
        table = await readProviderTable(join(cityDir, file));
      } catch (error) {
        input.logger.warn('cnas list unreadable', { ...log, code: errorCode(error) });
        continue;
      }
      if (table === null) {
        input.logger.warn('cnas list columns not found', log);
        continue;
      }
      const extraction = extractCnasProviders(table.rows, table.columns, city.name, seen);
      rows.push(...extraction.rows);
      counts.files_read += 1;
      counts.skipped_outside_city += extraction.skippedOutsideCity;
      counts.skipped_duplicate += extraction.skippedDuplicate;
      input.logger.info('cnas file read', {
        ...log,
        providers: extraction.rows.length,
        locality_filter: extraction.localityFilter,
      });
    }
    if (counts.files_read < group.files.length) {
      input.logger.warn('cnas list incomplete, previous import kept', {
        city: city.slug,
        kind: group.kind,
        list_date: group.listDate,
        files: group.files.length,
        files_read: counts.files_read,
      });
      continue;
    }
    const written = await replaceCnasProviders(input.sql, {
      cityId: city.id,
      kind: group.kind,
      listDate: group.listDate,
      sourceRef: group.sourceRef,
      rows,
    });
    lists += 1;
    providers += written;
    input.logger.info('cnas list imported', {
      city: city.slug,
      kind: group.kind,
      list_date: group.listDate,
      providers: written,
      ...counts,
    });
  }
  return { lists, providers };
}

async function placeHospitals(
  input: ImportHealthSourcesInput,
  city: CoveredCity,
  rows: readonly EmergencyRow[],
): Promise<(EmergencyRow & { location: Point })[]> {
  const geocoder = createLazyGeocoder(async () =>
    loadCityGeocoder(
      input,
      city,
      await downloadOsmExtract(input.osmExtract, input.sourcesDir, input.period),
    ),
  );
  const { placed, unplaced } = await placeEmergencyRows(rows, geocoder.geocode);
  for (const name of unplaced) {
    input.logger.warn('emergency unit not placed', { city: city.slug, name });
  }
  return placed;
}

async function importEmergencyHospitals(
  input: ImportHealthSourcesInput,
  cities: readonly CoveredCity[],
): Promise<number> {
  const path = join(input.dir, 'upu-cpu.csv');
  if (!existsSync(path)) {
    input.logger.warn('emergency list missing', {});
    return 0;
  }
  const rows: EmergencyRow[] = [];
  let skipped = 0;
  for (const raw of await readCsvFile(path, EMERGENCY_COLUMNS)) {
    const row = emergencyRow(raw);
    if (row === null) skipped += 1;
    else rows.push(row);
  }
  if (skipped > 0) input.logger.warn('emergency rows skipped', { skipped });

  let synced = 0;
  for (const city of cities) {
    const cityRows = rows.filter((row) => row.citySlug === city.slug);
    if (cityRows.length === 0) {
      input.logger.warn('emergency list has no rows for city', { city: city.slug });
      continue;
    }
    const placed = await placeHospitals(input, city, cityRows);
    if (placed.length < cityRows.length) {
      input.logger.warn('emergency list incomplete, city kept as is', {
        city: city.slug,
        listed: cityRows.length,
        placed: placed.length,
      });
      continue;
    }
    const result = await syncEmergencyHospitals(input.sql, city.id, input.validFrom, placed);
    synced += 1;
    input.logger.info('emergency units imported', {
      city: city.slug,
      listed: cityRows.length,
      placed: placed.length,
      ...result,
    });
  }
  return synced;
}

export async function importHealthSources(
  input: ImportHealthSourcesInput,
): Promise<ImportHealthSourcesResult> {
  const cities = await listCoveredCities(input.sql, input.citySlugs);
  let cnasLists = 0;
  let cnasProviders = 0;
  for (const city of cities) {
    const imported = await importCnasLists(input, city);
    cnasLists += imported.lists;
    cnasProviders += imported.providers;
  }
  const emergencyCities = await importEmergencyHospitals(input, cities);
  return { cnasLists, cnasProviders, emergencyCities };
}
