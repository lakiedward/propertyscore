import { educationModule } from './education/education.module.ts';
import { fifteenMinuteModule } from './fifteen-minute/fifteen-minute.module.ts';
import type { ScoreModule } from './score-module.ts';

export const SCORE_MODULES: readonly ScoreModule[] = [fifteenMinuteModule, educationModule];
