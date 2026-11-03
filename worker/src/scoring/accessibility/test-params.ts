import type { AccessibilityParams } from './accessibility.params.ts';

export const TEST_PARAMS: AccessibilityParams = {
  weights: { access: 40, travel: 45, coverage: 15 },
  walk_speed_kmh: 4.5,
  reference: {
    weekdays: [2, 3],
    peak_start: '07:30',
    peak_end: '08:30',
    window_start: '07:45',
    window_end: '08:15',
    detail_departure: '08:00',
  },
  modes: {
    bus: { radius_m: 400, reliability_min: 2, osm_departures_per_hour: 4, osm_speed_kmh: 18 },
    trolleybus: {
      radius_m: 400,
      reliability_min: 2,
      osm_departures_per_hour: 4,
      osm_speed_kmh: 18,
    },
    tram: { radius_m: 600, reliability_min: 1, osm_departures_per_hour: 5, osm_speed_kmh: 20 },
    subway: {
      radius_m: 800,
      reliability_min: 0.75,
      osm_departures_per_hour: 10,
      osm_speed_kmh: 35,
    },
  },
  access: { ai_min: 1, ai_max: 40 },
  travel: {
    full_at_min: 10,
    zero_at_min: 60,
    airport_full_at_min: 20,
    airport_zero_at_min: 75,
    max_minutes: 90,
    max_transfers: 2,
    kind_weights: { center: 30, station: 15, university: 15, hospital: 15, mall: 15, airport: 10 },
  },
  coverage: { sectors: 8, min_distance_m: 1500, multimodal_bonus: 0.1 },
  smoothing: { cell: 0.7, neighbours: 0.3 },
  matrix: { max_minutes: 90 },
};
