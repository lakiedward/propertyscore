import type { LngLat } from '@/components/map/map.config';
import type { Tables } from '@/lib/supabase/database.types';
import freidorfResult from './fixtures/smart-check-report-freidorf.json';

type ReportRow = Pick<
  Tables<'online_reports'>,
  | 'id'
  | 'number'
  | 'status'
  | 'address_text'
  | 'latitude'
  | 'longitude'
  | 'declared_rooms'
  | 'declared_area_m2'
  | 'declared_floor'
  | 'declared_building_floors'
  | 'declared_construction_year'
  | 'overall_score'
  | 'pdf_path'
  | 'created_at'
  | 'generated_at'
> & { result: unknown };

export const FREIDORF_REPORT_RESULT: Record<string, unknown> = freidorfResult;

let sequence = 0;

const OWNER_ID = 'a0000000-0000-4000-8000-000000000001';

const FREIDORF_ADDRESS = {
  address: 'Freidorf, Timișoara',
  latitude: 45.72912,
  longitude: 21.18007,
};

export function buildCheckOrder() {
  return { ...FREIDORF_ADDRESS, locale: 'ro' as const };
}

export function buildReportRow(overrides: Partial<ReportRow> = {}): ReportRow {
  sequence += 1;
  const id = `d1000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
  return {
    id,
    number: sequence,
    status: 'ready',
    address_text: FREIDORF_ADDRESS.address,
    latitude: FREIDORF_ADDRESS.latitude,
    longitude: FREIDORF_ADDRESS.longitude,
    declared_rooms: null,
    declared_area_m2: null,
    declared_floor: null,
    declared_building_floors: null,
    declared_construction_year: null,
    overall_score: 46,
    pdf_path: `${OWNER_ID}/${id}.pdf`,
    created_at: '2026-11-19T13:58:40.000Z',
    generated_at: '2026-11-19T13:59:23.517Z',
    result: FREIDORF_REPORT_RESULT,
    ...overrides,
  };
}

export function toMyReportRow({
  id,
  number,
  status,
  address_text,
  overall_score,
  pdf_path,
  created_at,
  generated_at,
}: ReportRow) {
  return { id, number, status, address_text, overall_score, pdf_path, created_at, generated_at };
}

export function toSharedReportRow(row: ReportRow) {
  return Object.fromEntries(Object.entries(row).filter(([column]) => column !== 'pdf_path'));
}

export const SAVED_WALK_POLYLINE = '_alsT_ouceAAn@';
export const ONE_POINT_WALK_POLYLINE = '_alsT_ouceA';
export const TRANSIT_MAP_POINTS: readonly [LngLat, LngLat] = [
  [20, 45],
  [20.02, 45.02],
];

type SavedMapGeometry = {
  walkingPolylines?: readonly string[];
  transitLines?: readonly (readonly LngLat[])[];
};

export function buildSavedWalkReport(
  distanceMethod = 'pedestrian_routing',
  { walkingPolylines = [SAVED_WALK_POLYLINE], transitLines }: SavedMapGeometry = {},
) {
  const distribution = { score: 63, percentile: 65, city_avg: 46, histogram: [] };
  const shops = Array.from({ length: Math.max(1, walkingPolylines.length) }, (_, index) => ({
    id: `shop-${index + 1}`,
    category: 'supermarket',
    lng: 20.02 + index * 0.01,
    lat: 45.02 + index * 0.01,
    minutes: 7 + index,
    name: null,
  }));
  const walking = {
    status: 'scored',
    covered: 2,
    total: 3,
    distance_method: distanceMethod,
    walk_speed_kmh: 4.5,
    groups: [],
    categories: [
      { key: 'pharmacy', group: 'pharmacies', t1_min: 14, n15: 1, status: 'ok' },
      { key: 'supermarket', group: 'shops', t1_min: 7, n15: shops.length, status: 'ok' },
      { key: 'restaurant', group: 'food_drink', t1_min: 19, n15: 0, status: 'missing' },
    ],
    places: [
      { id: 'pharmacy-1', category: 'pharmacy', lng: 20.01, lat: 45.01, minutes: 14, name: null },
      ...shops,
    ],
    isochrones: [],
    routes:
      distanceMethod === 'pedestrian_routing'
        ? walkingPolylines.map((polyline6, index) => ({
            place_id: `shop-${index + 1}`,
            minutes: 7 + index,
            distance_m: 500 + index * 100,
            polyline6,
          }))
        : [],
  };
  const accessibility = transitLines && {
    status: 'scored',
    data_quality: 'gtfs',
    reference_date: null,
    stops: [],
    routes: [],
    destinations: [
      {
        id: 'station-1',
        kind: 'train_station',
        label: { ro: 'Gară', en: 'Train station' },
        location: TRANSIT_MAP_POINTS[1],
        minutes: 15,
        by_walking: false,
        walk: 5,
        wait: 1,
        ride: 9,
        transfers: 0,
        route: null,
        path: transitLines.map((coordinates) => ({ mode: 'transit', coordinates })),
      },
    ],
  };
  return buildReportRow({
    address_text: 'Test Address 10',
    latitude: 45,
    longitude: 20,
    pdf_path: null,
    overall_score: 52,
    result: {
      city: { slug: 'test-city', name: 'Test City' },
      snapshot: { period: '2026-10-01', source_dates: {} },
      zone: distribution,
      categories: { fifteen_minute: { ...distribution, weight: 1 } },
      fifteen_minute: walking,
      accessibility,
    },
  });
}
