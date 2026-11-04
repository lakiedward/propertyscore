import type { DeclaredDetails } from '../../report/declared.ts';
import type { QuestionsParams } from './questions.params.ts';

type Home = Pick<DeclaredDetails, 'floor' | 'buildingFloors' | 'hasElevator' | 'constructionYear'>;

export function questionCodes(home: Home, params: QuestionsParams): string[] {
  const codes = [...params.always];
  if (home.constructionYear === null) codes.push(params.unknown_construction_year);
  const { floor, buildingFloors } = home;
  if (floor !== null && floor >= params.stairs.min_floor && home.hasElevator === false) {
    codes.push(params.stairs.code);
  }
  if (floor !== null && floor <= 0) codes.push(params.ground_floor);
  if (floor !== null && floor > 0 && buildingFloors !== null && floor >= buildingFloors) {
    codes.push(params.top_floor);
  }
  return [...new Set(codes)];
}
