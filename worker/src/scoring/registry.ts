import { industryModule } from './industry/industry.module.ts';
import type { ScoreModule } from './score-module.ts';

export const SCORE_MODULES: readonly ScoreModule[] = [industryModule];
