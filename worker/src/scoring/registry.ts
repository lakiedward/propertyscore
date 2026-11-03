import { accessibilityModule } from './accessibility/accessibility.module.ts';
import type { ScoreModule } from './score-module.ts';

export const SCORE_MODULES: readonly ScoreModule[] = [accessibilityModule];
