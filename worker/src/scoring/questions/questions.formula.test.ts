import { describe, expect, it } from 'vitest';

import { questionCodes } from './questions.formula.ts';
import { parseQuestionsParams } from './questions.params.ts';

const PARAMS = parseQuestionsParams({
  always: ['bedroom_facade_side'],
  unknown_construction_year: 'construction_year',
  stairs: { min_floor: 3, code: 'stairs_without_elevator' },
  ground_floor: 'ground_floor_damp_and_security',
  top_floor: 'top_floor_roof_and_insulation',
});

const HOME = { floor: 2, buildingFloors: 4, hasElevator: true, constructionYear: 1985 };

describe('questionCodes', () => {
  it('always asks about the facade of the bedroom', () => {
    expect(questionCodes(HOME, PARAMS)).toEqual(['bedroom_facade_side']);
  });

  it('asks for the construction year when it was not declared', () => {
    expect(questionCodes({ ...HOME, constructionYear: null }, PARAMS)).toEqual([
      'bedroom_facade_side',
      'construction_year',
    ]);
  });

  it('asks about the stairs on a high floor without an elevator', () => {
    expect(questionCodes({ ...HOME, floor: 3, hasElevator: false }, PARAMS)).toContain(
      'stairs_without_elevator',
    );
    expect(questionCodes({ ...HOME, floor: 3, hasElevator: null }, PARAMS)).not.toContain(
      'stairs_without_elevator',
    );
  });

  it('asks about damp and security on the ground floor', () => {
    expect(questionCodes({ ...HOME, floor: 0 }, PARAMS)).toContain(
      'ground_floor_damp_and_security',
    );
  });

  it('asks about the roof on the top floor', () => {
    expect(questionCodes({ ...HOME, floor: 4 }, PARAMS)).toContain('top_floor_roof_and_insulation');
    expect(questionCodes({ ...HOME, floor: 4, buildingFloors: null }, PARAMS)).not.toContain(
      'top_floor_roof_and_insulation',
    );
  });
});
