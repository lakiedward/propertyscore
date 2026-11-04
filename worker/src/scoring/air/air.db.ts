import { type JsonObject, type Sql, withLongStatements } from '../../db/sql.ts';
import type { GeoPoint } from '../../sources/gdal.ts';
import type { CalibrationResult, MonthlySeries, VerdictCode } from './air.formula.ts';
import type { Pollutant } from './air.params.ts';
import type { StationDataset, StationRecord } from './stations.source.ts';

const BATCH_SIZE = 1000;

export type CellPoint = GeoPoint & { cellId: string };

export type StationMonthRow = {
  station_id: string;
  pollutant: Pollutant;
  month: string;
  mean: number;
  valid_days: number;
  source: StationDataset;
};

export type CalibrationStation = GeoPoint & {
  stationId: string;
  months: Record<Pollutant, Map<string, number>>;
};

export type CellAirRow = {
  cell_id: string;
  period_start: string;
  period_end: string;
  pm25_monthly: MonthlySeries;
  no2_monthly: MonthlySeries;
  pm25_annual: number | null;
  no2_annual: number | null;
  pm25_valid_months: number;
  no2_valid_months: number;
  pm25_months_over_eu2030: number | null;
  no2_months_over_eu2030: number | null;
  spatial_method: 'eea_1km' | 'cams_10km';
  sub_scores: JsonObject;
  score_raw: number | null;
  score_display: number | null;
  verdict_code: VerdictCode | null;
  watch_item: boolean;
};

export async function upsertAirStations(
  sql: Sql,
  stations: readonly StationRecord[],
): Promise<Map<string, string>> {
  await sql`select private.upsert_air_stations(${sql.json(stations)}::jsonb)`;
  const rows = await sql<
    { id: string; eoi_code: string }[]
  >`select id, eoi_code from private.air_stations`;
  return new Map(rows.map((row) => [row.eoi_code, row.id]));
}

export async function writeStationMonths(
  sql: Sql,
  rows: readonly StationMonthRow[],
): Promise<number> {
  let written = 0;
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const result = await sql`
      insert into private.air_station_months (station_id, pollutant, month, mean, valid_days, source)
      select station_id, pollutant, month, round(mean::numeric, 2), valid_days, source
      from jsonb_to_recordset(${sql.json(batch)}::jsonb) as row (
        station_id uuid, pollutant text, month date, mean double precision, valid_days smallint, source text
      )
      on conflict (station_id, pollutant, month) do update
      set mean = excluded.mean, valid_days = excluded.valid_days, source = excluded.source, imported_at = now()
    `;
    written += result.count;
  }
  return written;
}

export async function listCityCells(
  sql: Sql,
  snapshotId: string,
  cityId: string,
): Promise<CellPoint[]> {
  const rows = await sql<{ cell_id: string; lon: number; lat: number }[]>`
    select
      g.id as cell_id,
      extensions.st_x(g.center::extensions.geometry) as lon,
      extensions.st_y(g.center::extensions.geometry) as lat
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    where cs.snapshot_id = ${snapshotId} and g.city_id = ${cityId}
    order by g.cell_key
  `;
  return rows.map((row) => ({ cellId: row.cell_id, lon: row.lon, lat: row.lat }));
}

export async function listCalibrationStations(
  sql: Sql,
  cityId: string,
  areaTypes: readonly string[],
  months: readonly string[],
): Promise<CalibrationStation[]> {
  const rows = await sql<
    {
      station_id: string;
      lon: number;
      lat: number;
      pollutant: Pollutant | null;
      month: string | null;
      mean: string | null;
    }[]
  >`
    select
      s.id as station_id,
      extensions.st_x(s.location::extensions.geometry) as lon,
      extensions.st_y(s.location::extensions.geometry) as lat,
      m.pollutant,
      to_char(m.month, 'YYYY-MM-DD') as month,
      m.mean
    from private.air_stations s
    left join private.air_station_months m
      on m.station_id = s.id
      and m.month in (select jsonb_array_elements_text(${sql.json([...months])}::jsonb)::date)
    where s.city_id = ${cityId}
      and s.station_type = 'background'
      and s.area_type in (select jsonb_array_elements_text(${sql.json([...areaTypes])}::jsonb))
    order by s.eoi_code
  `;
  const stations = new Map<string, CalibrationStation>();
  for (const row of rows) {
    const station = stations.get(row.station_id) ?? {
      stationId: row.station_id,
      lon: row.lon,
      lat: row.lat,
      months: { pm25: new Map<string, number>(), no2: new Map<string, number>() },
    };
    stations.set(row.station_id, station);
    if (row.pollutant && row.month && row.mean !== null)
      station.months[row.pollutant].set(row.month, Number(row.mean));
  }
  return [...stations.values()];
}

export async function listCellNeighbours(
  sql: Sql,
  cityId: string,
  cellSizeM: number,
): Promise<Map<string, string[]>> {
  const rows = await withLongStatements(sql, async (transaction) => [
    ...(await transaction<{ cell_id: string; neighbour_id: string }[]>`
      select cell_id, neighbour_id from private.grid_cell_neighbours(${cityId}, ${cellSizeM})
    `),
  ]);
  const neighbours = new Map<string, string[]>();
  for (const row of rows)
    neighbours.set(row.cell_id, [...(neighbours.get(row.cell_id) ?? []), row.neighbour_id]);
  return neighbours;
}

export async function writeCityCalibration(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  pollutant: Pollutant,
  calibration: CalibrationResult,
): Promise<void> {
  await sql`
    insert into private.air_city_calibration
      (snapshot_id, city_id, pollutant, factor, stations_used, station_mean, model_mean, status)
    values (
      ${snapshotId}, ${cityId}, ${pollutant}, round(${calibration.factor}::numeric, 3), ${calibration.stationsUsed},
      round(${calibration.stationMean}::numeric, 2), round(${calibration.modelMean}::numeric, 2), ${calibration.status}
    )
    on conflict (snapshot_id, city_id, pollutant) do update
    set
      factor = excluded.factor,
      stations_used = excluded.stations_used,
      station_mean = excluded.station_mean,
      model_mean = excluded.model_mean,
      status = excluded.status
  `;
}

export async function writeCellAir(
  sql: Sql,
  snapshotId: string,
  rows: readonly CellAirRow[],
): Promise<number> {
  let written = 0;
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const result = await sql`
      insert into private.cell_air (
        snapshot_id, cell_id, period_start, period_end, pm25_monthly, no2_monthly, pm25_annual, no2_annual,
        pm25_valid_months, no2_valid_months, pm25_months_over_eu2030, no2_months_over_eu2030,
        spatial_method, sub_scores, score_raw, score_display, verdict_code, watch_item
      )
      select
        ${snapshotId}, row.cell_id, row.period_start, row.period_end,
        array(select (value #>> '{}')::numeric from jsonb_array_elements(row.pm25_monthly) as value),
        array(select (value #>> '{}')::numeric from jsonb_array_elements(row.no2_monthly) as value),
        row.pm25_annual, row.no2_annual, row.pm25_valid_months, row.no2_valid_months,
        row.pm25_months_over_eu2030, row.no2_months_over_eu2030, row.spatial_method, row.sub_scores,
        row.score_raw, row.score_display, row.verdict_code, row.watch_item
      from jsonb_to_recordset(${sql.json(batch)}::jsonb) as row (
        cell_id uuid, period_start date, period_end date, pm25_monthly jsonb, no2_monthly jsonb,
        pm25_annual numeric, no2_annual numeric, pm25_valid_months smallint, no2_valid_months smallint,
        pm25_months_over_eu2030 smallint, no2_months_over_eu2030 smallint, spatial_method text,
        sub_scores jsonb, score_raw smallint, score_display smallint, verdict_code text, watch_item boolean
      )
      on conflict (snapshot_id, cell_id) do update
      set
        period_start = excluded.period_start,
        period_end = excluded.period_end,
        pm25_monthly = excluded.pm25_monthly,
        no2_monthly = excluded.no2_monthly,
        pm25_annual = excluded.pm25_annual,
        no2_annual = excluded.no2_annual,
        pm25_valid_months = excluded.pm25_valid_months,
        no2_valid_months = excluded.no2_valid_months,
        pm25_months_over_eu2030 = excluded.pm25_months_over_eu2030,
        no2_months_over_eu2030 = excluded.no2_months_over_eu2030,
        spatial_method = excluded.spatial_method,
        sub_scores = excluded.sub_scores,
        score_raw = excluded.score_raw,
        score_display = excluded.score_display,
        verdict_code = excluded.verdict_code,
        watch_item = excluded.watch_item
    `;
    written += result.count;
  }
  return written;
}

export async function writeAirCityStats(
  sql: Sql,
  snapshotId: string,
  citySlug: string,
  stats: JsonObject,
): Promise<void> {
  await sql`
    update public.score_snapshots
    set stats = stats || jsonb_build_object(
      'air',
      coalesce(stats -> 'air', '{}'::jsonb) || jsonb_build_object(${citySlug}::text, ${sql.json(stats)}::jsonb)
    )
    where id = ${snapshotId}
  `;
}
