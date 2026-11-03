import { noiseModule } from './noise/noise.module.ts';
import type { ScoreModule } from './score-module.ts';

export const SCORE_MODULES: readonly ScoreModule[] = [noiseModule];
