import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';

import type { JsonObject } from '../../db/sql.ts';
import { errorCode } from '../../lib/errors.ts';
import type { CoveredCity } from '../../snapshot/snapshot.db.ts';
import { downloadOnce } from '../../sources/download.ts';
import { cityBoundingBox, downloadOsmExtract, osmExtractDate } from '../../sources/osm.ts';
import type { ScoreModule } from '../score-module.ts';
import { writeCategoryScores, type CellCategoryScore } from '../write-category-scores.ts';
import { evaluateCell, type CityTransitContext } from './accessibility.cell.ts';
import {
  clearCityTransit,
  insertCellTransit,
  insertFeed,
  insertNetwork,
  insertTravelMatrix,
  listCellNeighbours,
  listCityCells,
  listDestinationLabels,
  listFeedSources,
  listKeyDestinations,
  writeCityStats,
  type CellTransitRow,
  type FeedRecord,
} from './accessibility.db.ts';
import { smoothScore } from './accessibility.formula.ts';
import { parseAccessibilityParams, type AccessibilityParams } from './accessibility.params.ts';
import {
  activeServices,
  buildGtfsNetwork,
  calendarRange,
  clockSeconds,
  readFeedInfo,
  readServiceCalendar,
  unzipGtfs,
} from './gtfs.ts';
import {
  buildOsmNetwork,
  clipOsmExtract,
  exportTransitOpl,
  readOpl,
  writeSyntheticGtfs,
} from './osm-transit.ts';
import { pickReferenceDate } from './reference-day.ts';
import { readMatrixRows, runTransitRouting } from './routing.ts';
import { mergeNetworks, stopRouteLinks, stopServices } from './transit-network.ts';
import type { TransitMode, TransitNetwork } from './transit.types.ts';

type CityNetwork = {
  network: TransitNetwork;
  gtfs: string[];
  referenceDate: string;
  dataQuality: 'gtfs' | 'osm_only';
};

async function sha256(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

function urlTag(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 12);
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function minutesBetween(start: string, end: string): number {
  return (clockSeconds(end) - clockSeconds(start)) / 60;
}

async function loadGtfsNetwork(options: {
  sql: Parameters<typeof listFeedSources>[0];
  snapshotId: string;
  city: CoveredCity;
  period: string;
  params: AccessibilityParams;
  sourcesDir: string;
  workDir: string;
}): Promise<{ network: CityNetwork | null; feeds: FeedRecord[] }> {
  const { params } = options;
  const sources = await listFeedSources(options.sql, options.city.id);
  const feeds: FeedRecord[] = [];
  const networks: TransitNetwork[] = [];
  const archives: string[] = [];
  let referenceDate: string | null = null;
  const peak = {
    startSeconds: clockSeconds(params.reference.peak_start),
    endSeconds: clockSeconds(params.reference.peak_end),
  };

  for (const [index, source] of sources.entries()) {
    const base: FeedRecord = {
      source: 'gtfs',
      operator: source.operator,
      sourceUrl: source.url,
      license: source.license,
      feedVersion: null,
      validFrom: null,
      validTo: null,
      referenceDate: null,
      sha256: null,
      status: 'failed',
      errorCode: null,
    };
    try {
      const archive = await downloadOnce(
        source.url,
        join(
          options.sourcesDir,
          'gtfs',
          options.city.slug,
          `${options.period.slice(0, 7)}-${urlTag(source.url)}.zip`,
        ),
      );
      const directory = await unzipGtfs(archive, join(options.workDir, `gtfs-${index}`));
      const info = await readFeedInfo(directory);
      const calendar = await readServiceCalendar(directory);
      const range = calendarRange(calendar);
      const hasService = (date: string) => activeServices(calendar, date).size > 0;
      const date: string | null =
        referenceDate === null
          ? pickReferenceDate(options.period, params.reference.weekdays, hasService)
          : hasService(referenceDate)
            ? referenceDate
            : null;
      const record: FeedRecord = {
        ...base,
        feedVersion: info.version,
        validFrom: info.validFrom ?? range?.from ?? null,
        validTo: info.validTo ?? range?.to ?? null,
        sha256: await sha256(archive),
      };
      if (date === null) {
        feeds.push({ ...record, status: 'expired', errorCode: 'no_reference_day' });
        continue;
      }
      referenceDate = date;
      networks.push(await buildGtfsNetwork({ directory, feedKey: `g${index}`, date, peak }));
      archives.push(archive);
      feeds.push({ ...record, referenceDate: date, status: 'used', errorCode: null });
    } catch (error) {
      feeds.push({ ...base, errorCode: errorCode(error) });
    }
  }

  if (referenceDate === null || networks.length === 0) return { network: null, feeds };
  return {
    network: {
      network: mergeNetworks(networks),
      gtfs: archives,
      referenceDate,
      dataQuality: 'gtfs',
    },
    feeds,
  };
}

async function loadOsmNetwork(options: {
  clipped: string;
  workDir: string;
  slug: string;
  period: string;
  params: AccessibilityParams;
}): Promise<CityNetwork | null> {
  const opl = await exportTransitOpl(options.clipped, options.workDir, options.slug);
  const network = buildOsmNetwork(await readOpl(opl));
  if (network.routes.length === 0) return null;
  const referenceDate = pickReferenceDate(
    options.period,
    options.params.reference.weekdays,
    () => true,
  );
  if (referenceDate === null) return null;
  const directory = await writeSyntheticGtfs({
    network,
    params: options.params,
    validFrom: options.period,
    validTo: addDays(options.period, 62),
    directory: join(options.workDir, 'osm-gtfs'),
  });
  return { network, gtfs: [directory], referenceDate, dataQuality: 'osm_only' };
}

function routeKeyResolver(network: TransitNetwork): (routeId: string | null) => string | null {
  const keys = new Set(network.routes.map((route) => route.key));
  return (routeId) => {
    if (!routeId) return null;
    if (keys.has(routeId)) return routeId;
    for (const key of keys) if (key.endsWith(`:${routeId}`)) return key;
    return null;
  };
}

export const accessibilityModule: ScoreModule = {
  key: 'accessibility',
  run: async (context) => {
    const params = parseAccessibilityParams(context.params);
    const { sql, snapshotId, logger } = context;
    const extract = await downloadOsmExtract(
      context.osmExtractUrl,
      context.sourcesDir,
      context.period,
    );
    const osmDate = await osmExtractDate(extract, context.period);
    const gtfsDates: string[] = [];

    for (const city of context.cities) {
      const workDir = join(context.sourcesDir, 'accessibility', snapshotId, city.slug);
      await clearCityTransit(sql, snapshotId, city.id);
      const clipped = await clipOsmExtract({
        extractPath: extract,
        bbox: await cityBoundingBox(sql, city.id),
        workDir,
        name: city.slug,
      });

      const gtfs = await loadGtfsNetwork({
        sql,
        snapshotId,
        city,
        period: context.period,
        params,
        sourcesDir: context.sourcesDir,
        workDir,
      });
      const loaded =
        gtfs.network ??
        (await loadOsmNetwork({
          clipped,
          workDir,
          slug: city.slug,
          period: context.period,
          params,
        }));
      const feeds = [...gtfs.feeds];
      if (!gtfs.network) {
        feeds.push({
          source: 'osm',
          operator: null,
          sourceUrl: context.osmExtractUrl,
          license: 'ODbL-1.0',
          feedVersion: osmDate,
          validFrom: null,
          validTo: null,
          referenceDate: loaded?.referenceDate ?? null,
          sha256: null,
          status: loaded ? 'used' : 'failed',
          errorCode: loaded ? null : 'no_transit_data',
        });
      } else {
        gtfsDates.push(gtfs.network.referenceDate);
      }
      for (const feed of feeds) await insertFeed(sql, snapshotId, city.id, feed);

      const cells = await listCityCells(sql, snapshotId, city.id);
      if (!loaded) {
        await writeCategoryScores(
          sql,
          snapshotId,
          'accessibility',
          cells.map((cell) => ({
            cellId: cell.cellId,
            score: null,
            inputs: { reason: 'no_transit_data' },
          })),
        );
        await writeCityStats(sql, snapshotId, city.id, city.slug, {
          data_quality: null,
          feeds: feeds.map((feed) => ({
            source: feed.source,
            status: feed.status,
            error_code: feed.errorCode,
          })),
        });
        logger.warn('accessibility without transit data', { city: city.slug });
        continue;
      }

      const { network } = loaded;
      const links = stopRouteLinks(network);
      await insertNetwork(sql, snapshotId, city.id, network, links);
      const destinations = await listKeyDestinations(sql, city.id);
      const maxRadius = Math.max(...Object.values(params.modes).map((mode) => mode.radius_m));
      const routing = await runTransitRouting({
        osmPbf: clipped,
        gtfs: loaded.gtfs,
        date: loaded.referenceDate,
        windowStart: params.reference.window_start,
        windowMinutes: minutesBetween(params.reference.window_start, params.reference.window_end),
        detailDeparture: params.reference.detail_departure,
        walkSpeedKmh: params.walk_speed_kmh,
        maxMinutes: params.travel.max_minutes,
        maxRides: params.travel.max_transfers + 1,
        stopWalkMaxMinutes: Math.ceil(maxRadius / ((params.walk_speed_kmh * 1000) / 60)) + 1,
        origins: cells.map((cell) => ({ id: cell.cellId, lng: cell.lng, lat: cell.lat })),
        stops: network.stops.map((stop) => ({ id: stop.key, lng: stop.lng, lat: stop.lat })),
        destinations: destinations.map((item) => ({ id: item.id, lng: item.lng, lat: item.lat })),
        withMatrix: true,
        workDir,
      });

      const cityContext: CityTransitContext = {
        params,
        stops: new Map(network.stops.map((stop) => [stop.key, stop])),
        services: stopServices(network, links),
        patterns: network.patterns,
        modeOfRoute: new Map<string, TransitMode>(
          network.routes.map((route) => [route.key, route.mode]),
        ),
        destinations,
        routeKeyOf: routeKeyResolver(network),
      };
      const evaluations = new Map(
        cells.map((cell) => [
          cell.cellId,
          evaluateCell(cityContext, {
            origin: cell,
            walks: routing.walkToStops.get(cell.cellId) ?? [],
            timings: routing.destinations.get(cell.cellId) ?? new Map(),
            itineraries: routing.itineraries.get(cell.cellId) ?? new Map(),
          }),
        ]),
      );

      const transitRows: CellTransitRow[] = cells.map((cell) => {
        const evaluation = evaluations.get(cell.cellId);
        return {
          cellId: cell.cellId,
          accessIndex: evaluation?.accessIndex ?? null,
          sAccess: evaluation?.sAccess ?? null,
          sTravel: evaluation?.sTravel ?? null,
          sCoverage: evaluation?.sCoverage ?? null,
          stops: evaluation?.stops ?? [],
          destinations: evaluation?.destinations ?? [],
          directions: evaluation?.directions ?? null,
          dataQuality: loaded.dataQuality,
        };
      });
      await insertCellTransit(sql, snapshotId, transitRows);

      const neighbours = await listCellNeighbours(sql, snapshotId, city.id, context.cellSizeM);
      const scores: CellCategoryScore[] = cells.map((cell) => {
        const evaluation = evaluations.get(cell.cellId);
        const raw = evaluation?.raw ?? null;
        const neighbourRaws = (neighbours.get(cell.cellId) ?? []).map(
          (id) => evaluations.get(id)?.raw ?? null,
        );
        const inputs: JsonObject = {
          raw,
          s_access: evaluation ? Math.round(evaluation.sAccess * 1000) / 1000 : null,
          s_travel:
            evaluation?.sTravel === null || evaluation === undefined
              ? null
              : Math.round(evaluation.sTravel * 1000) / 1000,
          s_coverage: evaluation ? Math.round(evaluation.sCoverage * 1000) / 1000 : null,
          access_index: evaluation ? Math.round(evaluation.accessIndex * 1000) / 1000 : null,
          directions: evaluation?.directions ?? null,
          weights: params.weights,
          data_quality: loaded.dataQuality,
          distance_method: 'r5py',
          reference_date: loaded.referenceDate,
        };
        if (evaluation?.sTravel === null) inputs.missing = ['travel'];
        if (raw === null) inputs.reason = 'no_source_data';
        return {
          cellId: cell.cellId,
          score: smoothScore(raw, neighbourRaws, params.smoothing),
          inputs,
        };
      });
      await writeCategoryScores(sql, snapshotId, 'accessibility', scores);

      if (routing.matrixPath) {
        const rows = await readMatrixRows(routing.matrixPath, cells.length);
        await insertTravelMatrix(
          sql,
          snapshotId,
          city.id,
          cells.map((cell, index) => ({
            cellId: cell.cellId,
            minutes: rows[index] ?? Buffer.alloc(0),
          })),
        );
      }

      await writeCityStats(sql, snapshotId, city.id, city.slug, {
        data_quality: loaded.dataQuality,
        reference_date: loaded.referenceDate,
        partial_cells: loaded.dataQuality === 'osm_only' ? cells.length : 0,
        stops: network.stops.length,
        routes: network.routes.length,
        destinations: await listDestinationLabels(sql, city.id),
        feeds: feeds.map((feed) => ({
          source: feed.source,
          operator: feed.operator,
          version: feed.feedVersion,
          status: feed.status,
          error_code: feed.errorCode,
        })),
      });
      logger.info('accessibility city scored', {
        city: city.slug,
        cells: cells.length,
        stops: network.stops.length,
        routes: network.routes.length,
        data_quality: loaded.dataQuality,
      });
    }

    const sourceDates: Record<string, string> = { osm: osmDate };
    const latestGtfs = gtfsDates.sort().at(-1);
    if (latestGtfs) sourceDates.gtfs = latestGtfs;
    return { sourceDates };
  },
};
