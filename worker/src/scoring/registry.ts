import { fifteenMinuteModule } from './fifteen-minute/fifteen-minute.module.ts';
import { healthModule } from './health/health.module.ts';
import type { ScoreModule } from './score-module.ts';

export const SCORE_MODULES: readonly ScoreModule[] = [fifteenMinuteModule, healthModule];
