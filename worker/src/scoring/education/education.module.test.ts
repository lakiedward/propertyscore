import { describe, expect, it } from 'vitest';

import type { ValhallaClient } from '../../routing/valhalla.ts';
import type { EducationCandidate } from './education.db.ts';
import { scoreCell } from './education.module.ts';
import type { EducationParams, ScoredLevel } from './education.params.ts';

const PARAMS: EducationParams = {
  levels: {
    kindergarten: { full_min: 8, zero_min: 20, weight: 30 },
    school: { full_min: 10, zero_min: 25, weight: 45 },
    high_school: { full_min: 15, zero_min: 35, weight: 25 },
  },
  choice_weight: 0.25,
  neighbour_weight: 0.4,
  walk_speed_kmh: 4.5,
  walk_detour_factor: 1.3,
  max_candidates: 12,
  count_bands_min: [5, 10, 15],
  require_official_register: true,
  register: {
    school_year: '2025-2026',
    url: 'https://data.gov.ro/siiir-2025-2026.xlsx',
    cities: { timisoara: [155252] },
  },
  match: { radius_m: 300, min_similarity: 0.6, name_only_similarity: 0.9 },
};

function candidate(
  level: ScoredLevel,
  institutionId: string,
  straightM: number,
): EducationCandidate & { level: ScoredLevel } {
  return {
    level,
    cell_id: 'cell-1',
    cell_lng: 21.23,
    cell_lat: 45.75,
    poi_id: `poi-${level}-${institutionId}`,
    poi_lng: 21.24,
    poi_lat: 45.75,
    institution_id: institutionId,
    entity: institutionId,
    straight_m: straightM,
  };
}

const CELL = {
  lng: 21.23,
  lat: 45.75,
  candidates: [
    candidate('kindergarten', 'k1', 300),
    candidate('kindergarten', 'k2', 500),
    candidate('school', 's1', 450),
    candidate('school', 's2', 900),
    candidate('high_school', 'h1', 1300),
    candidate('high_school', 'h2', 1700),
  ],
};

const MINUTES: Record<string, number> = {
  'poi-kindergarten-k1': 4,
  'poi-kindergarten-k2': 7,
  'poi-school-s1': 6,
  'poi-school-s2': 13,
  'poi-high_school-h1': 18,
  'poi-high_school-h2': 24,
};

function fakeRouter(): ValhallaClient {
  return {
    matrix: ({ targets }) =>
      Promise.resolve([
        targets.map((target) => {
          const poiId = 'poi_id' in target ? String(target.poi_id) : '';
          const minutes = MINUTES[poiId];
          return minutes === undefined ? null : { seconds: minutes * 60, meters: minutes * 75 };
        }),
      ]),
    isochrones: () => Promise.resolve([]),
    route: () => Promise.resolve(null),
    tilesetDate: () => Promise.resolve(null),
  };
}

describe('scoreCell', () => {
  it('scores the worked example of the plan from routed walking times', async () => {
    const result = await scoreCell(
      { router: fakeRouter() },
      PARAMS,
      'cell-1',
      CELL,
      'pedestrian_routing',
    );
    expect(result.raw).toBe(92);
    expect(result.inputs).toMatchObject({
      levels: {
        kindergarten: { t1: 4, t2: 7, s: 1 },
        school: { t1: 6, t2: 13, s: 0.95 },
        high_school: { t1: 18, t2: 24, s: 0.775 },
      },
      counts: { m5: 1, m10: 3, m15: 4 },
      nearest_ids: ['k1', 's1', 'h1'],
      distance_method: 'pedestrian_routing',
    });
  });

  it('falls back to the straight line times the detour factor without a router', async () => {
    const result = await scoreCell({ router: null }, PARAMS, 'cell-1', CELL, 'straight_line');
    expect(result.inputs).toMatchObject({
      levels: { kindergarten: { t1: 5.2 } },
      distance_method: 'straight_line',
    });
  });

  it('gives a cell without any unit nearby a score of zero, not no data', async () => {
    const result = await scoreCell({ router: null }, PARAMS, 'cell-2', undefined, 'straight_line');
    expect(result.raw).toBe(0);
    expect(result.inputs).toMatchObject({ counts: { m5: 0, m10: 0, m15: 0 }, nearest_ids: [] });
  });
});
