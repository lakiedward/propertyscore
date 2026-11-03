import { airModule } from './air/air.module.ts';
import { accessibilityModule } from './accessibility/accessibility.module.ts';
import { educationModule } from './education/education.module.ts';
import { fifteenMinuteModule } from './fifteen-minute/fifteen-minute.module.ts';
import { greenModule } from './green/green.module.ts';
import { industryModule } from './industry/industry.module.ts';
import { noiseModule } from './noise/noise.module.ts';
import type { ScoreModule } from './score-module.ts';
import { safetyModule } from './safety/safety.module.ts';

export const SCORE_MODULES: readonly ScoreModule[] = [
  safetyModule,
  accessibilityModule,
  fifteenMinuteModule,
  greenModule,
  noiseModule,
  airModule,
  industryModule,
  educationModule,
];
