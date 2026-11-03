import type { JsonObject, Sql } from '../../db/sql.ts';
import type { StopRouteLink } from './transit-network.ts';
import type { DestinationKind, KeyDestination, TransitNetwork } from './transit.types.ts';

export type CityCell = { cellId: string; cellKey: string; lng: number; lat: number };

export type FeedSource = {
  id: string;
  operator: string;
  url: string;
  license: string | null;
};

export type FeedRecord = {
  source: 'gtfs' | 'osm';
  operator: string | null;
  sourceUrl: string;
  license: string | null;
  feedVersion: string | null;
  validFrom: string | null;
  validTo: string | null;
  referenceDate: string | null;
  sha256: string | null;
  status: 'used' | 'expired' | 'failed';
  errorCode: string | null;
};

export type CellTransitRow = {
  cellId: string;
  accessIndex: number | null;
  sAccess: number | null;
  sTravel: number | null;
  sCoverage: number | null;
  stops: JsonObject[];
  destinations: JsonObject[];
  directions: number | null;
  dataQuality: 'gtfs' | 'osm_only';
};

const BATCH_SIZE = 500;

function batches<T>(rows: readonly T[], size = BATCH_SIZE): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < rows.length; start += size)
    result.push(rows.slice(start, start + size));
  return result;
}

function round(value: number | null, digits: number): number | null {
  if (value === null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export async function listCityCells(
  sql: Sql,
  snapshotId: string,
  cityId: string,
): Promise<CityCell[]> {
  const rows = await sql<{ cell_id: string; cell_key: string; lng: number; lat: number }[]>`
    select
      g.id as cell_id,
      g.cell_key,
      extensions.st_x(g.center::extensions.geometry) as lng,
      extensions.st_y(g.center::extensions.geometry) as lat
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    where cs.snapshot_id = ${snapshotId} and g.city_id = ${cityId}
    order by g.cell_key
  `;
  return rows.map((row) => ({
    cellId: row.cell_id,
    cellKey: row.cell_key,
    lng: row.lng,
    lat: row.lat,
  }));
}

export async function listCellNeighbours(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  cellSizeM: number,
): Promise<Map<string, string[]>> {
  const rows = await sql<{ cell_id: string; neighbours: string[] }[]>`
    select a.id as cell_id, array_agg(b.id) as neighbours
    from private.cell_scores cs
    join private.grid_cells a on a.id = cs.cell_id
    join private.grid_cells b
      on b.city_id = a.city_id
      and b.size_m = a.size_m
      and b.id <> a.id
      and extensions.st_dwithin(a.center, b.center, ${1.2 * Math.sqrt(3) * cellSizeM})
    where cs.snapshot_id = ${snapshotId} and a.city_id = ${cityId}
    group by a.id
  `;
  return new Map(rows.map((row) => [row.cell_id, row.neighbours]));
}

export async function listFeedSources(sql: Sql, cityId: string): Promise<FeedSource[]> {
  const rows = await sql<FeedSource[]>`
    select id, operator, url, license
    from private.transit_feed_sources
    where city_id = ${cityId} and is_active
    order by created_at, id
  `;
  return [...rows];
}

export async function listKeyDestinations(sql: Sql, cityId: string): Promise<KeyDestination[]> {
  const rows = await sql<{ id: string; kind: DestinationKind; lng: number; lat: number }[]>`
    select
      id,
      kind,
      extensions.st_x(location::extensions.geometry) as lng,
      extensions.st_y(location::extensions.geometry) as lat
    from private.key_destinations
    where city_id = ${cityId} and is_active
    order by kind, id
  `;
  return [...rows];
}

export async function listDestinationLabels(sql: Sql, cityId: string): Promise<JsonObject[]> {
  const rows = await sql<{ entry: JsonObject }[]>`
    select jsonb_build_object(
      'id', id,
      'kind', kind,
      'label_ro', label_ro,
      'label_en', label_en,
      'lng', extensions.st_x(location::extensions.geometry),
      'lat', extensions.st_y(location::extensions.geometry)
    ) as entry
    from private.key_destinations
    where city_id = ${cityId} and is_active
    order by kind, id
  `;
  return rows.map((row) => row.entry);
}

export async function clearCityTransit(
  sql: Sql,
  snapshotId: string,
  cityId: string,
): Promise<void> {
  await sql.begin(async (transaction) => {
    await transaction`delete from private.cell_travel_matrix where snapshot_id = ${snapshotId} and city_id = ${cityId}`;
    await transaction`
      delete from private.cell_transit ct
      using private.grid_cells g
      where ct.snapshot_id = ${snapshotId} and g.id = ct.cell_id and g.city_id = ${cityId}
    `;
    await transaction`delete from private.transit_stop_routes where snapshot_id = ${snapshotId} and city_id = ${cityId}`;
    await transaction`delete from private.transit_routes where snapshot_id = ${snapshotId} and city_id = ${cityId}`;
    await transaction`delete from private.transit_stops where snapshot_id = ${snapshotId} and city_id = ${cityId}`;
    await transaction`delete from private.transit_feeds where snapshot_id = ${snapshotId} and city_id = ${cityId}`;
  });
}

export async function insertFeed(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  feed: FeedRecord,
): Promise<void> {
  await sql`
    insert into private.transit_feeds (
      snapshot_id, city_id, source, operator, source_url, license, feed_version,
      valid_from, valid_to, reference_date, sha256, status, error_code
    )
    values (
      ${snapshotId}, ${cityId}, ${feed.source}, ${feed.operator}, ${feed.sourceUrl}, ${feed.license},
      ${feed.feedVersion}, ${feed.validFrom}, ${feed.validTo}, ${feed.referenceDate}, ${feed.sha256},
      ${feed.status}, ${feed.errorCode}
    )
    on conflict (snapshot_id, city_id, source, source_url) do update set
      operator = excluded.operator,
      license = excluded.license,
      feed_version = excluded.feed_version,
      valid_from = excluded.valid_from,
      valid_to = excluded.valid_to,
      reference_date = excluded.reference_date,
      sha256 = excluded.sha256,
      status = excluded.status,
      error_code = excluded.error_code,
      fetched_at = now()
  `;
}

export async function insertNetwork(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  network: TransitNetwork,
  links: readonly StopRouteLink[],
): Promise<void> {
  for (const batch of batches(network.stops)) {
    const rows = batch.map((stop) => ({
      stop_key: stop.key,
      name: stop.name,
      lng: stop.lng,
      lat: stop.lat,
      modes: stop.modes,
      wheelchair_boarding: stop.wheelchairBoarding,
    }));
    await sql`
      insert into private.transit_stops (snapshot_id, city_id, stop_key, name, location, modes, wheelchair_boarding)
      select
        ${snapshotId}, ${cityId}, r.stop_key, left(r.name, 300),
        extensions.st_point(r.lng, r.lat, 4326)::extensions.geography,
        array(select jsonb_array_elements_text(r.modes)),
        r.wheelchair_boarding
      from jsonb_to_recordset(${sql.json(rows)}::jsonb)
        as r (stop_key text, name text, lng float8, lat float8, modes jsonb, wheelchair_boarding smallint)
    `;
  }
  for (const batch of batches(network.routes, 100)) {
    const rows = batch.map((route) => ({
      route_key: route.key,
      ref: route.ref,
      mode: route.mode,
      long_name: route.longName,
      colour: route.colour,
      text_colour: route.textColour,
      geometry:
        route.lines.length === 0
          ? null
          : {
              type: 'MultiLineString',
              coordinates: route.lines.map((line) => line.map((point) => [point.lng, point.lat])),
            },
    }));
    await sql`
      insert into private.transit_routes (snapshot_id, city_id, route_key, ref, mode, long_name, colour, text_colour, geometry)
      select
        ${snapshotId}, ${cityId}, r.route_key, left(r.ref, 40), r.mode, left(r.long_name, 300),
        r.colour, r.text_colour,
        case when r.geometry is null then null else
          extensions.st_multi(
            extensions.st_simplifypreservetopology(
              extensions.st_setsrid(extensions.st_geomfromgeojson(r.geometry::text), 4326),
              0.00005
            )
          )::extensions.geography
        end
      from jsonb_to_recordset(${sql.json(rows)}::jsonb)
        as r (route_key text, ref text, mode text, long_name text, colour text, text_colour text, geometry jsonb)
    `;
  }
  for (const batch of batches(links)) {
    const rows = batch.map((link) => ({
      stop_key: link.stopKey,
      route_key: link.routeKey,
      direction_label: link.directionLabel.slice(0, 300),
      departures: link.departuresPerHour,
    }));
    await sql`
      insert into private.transit_stop_routes (snapshot_id, city_id, stop_key, route_key, direction_label, peak_departures_per_hour)
      select ${snapshotId}, ${cityId}, r.stop_key, r.route_key, r.direction_label, r.departures
      from jsonb_to_recordset(${sql.json(rows)}::jsonb)
        as r (stop_key text, route_key text, direction_label text, departures numeric)
    `;
  }
}

export async function insertCellTransit(
  sql: Sql,
  snapshotId: string,
  rows: readonly CellTransitRow[],
): Promise<void> {
  for (const batch of batches(rows)) {
    const records = batch.map((row) => ({
      cell_id: row.cellId,
      access_index: round(row.accessIndex, 3),
      s_access: round(row.sAccess, 3),
      s_travel: round(row.sTravel, 3),
      s_coverage: round(row.sCoverage, 3),
      stops: row.stops,
      destinations: row.destinations,
      directions: row.directions,
      data_quality: row.dataQuality,
    }));
    await sql`
      insert into private.cell_transit (
        snapshot_id, cell_id, access_index, s_access, s_travel, s_coverage, stops, destinations, directions, data_quality
      )
      select
        ${snapshotId}, r.cell_id, r.access_index, r.s_access, r.s_travel, r.s_coverage,
        r.stops, r.destinations, r.directions, r.data_quality
      from jsonb_to_recordset(${sql.json(records)}::jsonb) as r (
        cell_id uuid, access_index numeric, s_access numeric, s_travel numeric, s_coverage numeric,
        stops jsonb, destinations jsonb, directions smallint, data_quality text
      )
    `;
  }
}

export async function insertTravelMatrix(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  rows: readonly { cellId: string; minutes: Buffer }[],
): Promise<void> {
  for (const batch of batches(rows, 100)) {
    const records = batch.map((row) => ({
      cell_id: row.cellId,
      minutes: row.minutes.toString('hex'),
    }));
    await sql`
      insert into private.cell_travel_matrix (snapshot_id, city_id, origin_cell_id, minutes)
      select ${snapshotId}, ${cityId}, r.cell_id, decode(r.minutes, 'hex')
      from jsonb_to_recordset(${sql.json(records)}::jsonb) as r (cell_id uuid, minutes text)
    `;
  }
}

export async function writeCityStats(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  slug: string,
  extra: JsonObject,
): Promise<void> {
  await sql`
    with scores as (
      select (cs.categories ->> 'accessibility')::numeric as score
      from private.cell_scores cs
      join private.grid_cells g on g.id = cs.cell_id
      where cs.snapshot_id = ${snapshotId}
        and g.city_id = ${cityId}
        and cs.is_residential is not false
        and jsonb_typeof(cs.categories -> 'accessibility') = 'number'
    ),
    figures as (
      select jsonb_build_object(
        'avg', round(avg(score)),
        'percentiles', jsonb_build_object(
          'p10', percentile_cont(0.1) within group (order by score),
          'p25', percentile_cont(0.25) within group (order by score),
          'p50', percentile_cont(0.5) within group (order by score),
          'p75', percentile_cont(0.75) within group (order by score),
          'p90', percentile_cont(0.9) within group (order by score)
        )
      ) as value
      from scores
    )
    update public.score_snapshots s
    set stats = s.stats || jsonb_build_object(
      'accessibility',
      coalesce(s.stats -> 'accessibility', '{}'::jsonb)
        || jsonb_build_object(${slug}::text, figures.value || ${sql.json(extra)}::jsonb)
    )
    from figures
    where s.id = ${snapshotId}
  `;
}
