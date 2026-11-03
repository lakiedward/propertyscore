import { accessibilityModule } from './accessibility/accessibility.module.ts';
import { noiseModule } from './noise/noise.module.ts';
import type { ScoreModule } from './score-module.ts';
import { safetyModule } from './safety/safety.module.ts';

export const SCORE_MODULES: readonly ScoreModule[] = [
  safetyModule,
  accessibilityModule,
  noiseModule,
];
