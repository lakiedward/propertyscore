import { educationModule } from './education/education.module.ts';
import type { ScoreModule } from './score-module.ts';

export const SCORE_MODULES: readonly ScoreModule[] = [educationModule];
