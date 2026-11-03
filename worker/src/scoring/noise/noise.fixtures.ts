import { parseNoiseParams } from './noise.params.ts';

export const NOISE_PARAMS = parseNoiseParams({
  scale_lden: [40, 75],
  scale_lnight: [35, 65],
  night_weight: 0.3,
  intermittent_penalty_db: 3,
  intermittent_kinds: ['rail', 'air'],
  below_mapped_db: 50,
  band_width_db: 5,
  proxy_ref_db: {
    motorway: 78,
    trunk: 72,
    primary: 72,
    secondary: 68,
    tertiary: 63,
    residential: 55,
    tram: 65,
    rail: 70,
  },
  proxy_ref_distance_m: 10,
  proxy_night_offset_db: 8,
  screen_db: 5,
  screen_max_db: 10,
  nearest_radius_m: 1500,
  sample_offset_m: 100,
  map_clip_m: 1000,
  display_bands_db: [45, 55, 65, 70],
  who: {
    road: { lden: 53, lnight: 45 },
    rail: { lden: 54, lnight: 44 },
    air: { lden: 45, lnight: 40 },
  },
});
