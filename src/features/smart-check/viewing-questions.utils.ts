import type { ReportTab } from './report-chapter-meta';

export type ViewingQuestionTopic = 'noise' | 'seismic' | 'apartment';

export const VIEWING_QUESTION_TOPICS: Readonly<
  Record<ViewingQuestionTopic, { chapter: ReportTab | null; color: string; surface: string }>
> = {
  noise: { chapter: 'noise', color: 'var(--report-noise)', surface: 'var(--report-noise-surface)' },
  seismic: { chapter: 'seismic', color: '#7B5B3A', surface: '#EFE3D4' },
  apartment: { chapter: null, color: 'var(--ps-steel-600)', surface: 'var(--ps-steel-100)' },
};

const QUESTION_TOPIC_BY_CODE: Readonly<Record<ViewingQuestionCode, ViewingQuestionTopic>> = {
  bedroom_facade_side: 'noise',
  construction_year: 'seismic',
  stairs_without_elevator: 'apartment',
  ground_floor_damp_and_security: 'apartment',
  top_floor_roof_and_insulation: 'apartment',
};

type ViewingQuestionCode =
  | 'bedroom_facade_side'
  | 'construction_year'
  | 'stairs_without_elevator'
  | 'ground_floor_damp_and_security'
  | 'top_floor_roof_and_insulation';

export type ViewingQuestion = { code: ViewingQuestionCode; topic: ViewingQuestionTopic };

function isQuestionCode(code: string): code is ViewingQuestionCode {
  return Object.hasOwn(QUESTION_TOPIC_BY_CODE, code);
}

export function viewingQuestions(codes: readonly string[]): ViewingQuestion[] {
  return codes.flatMap((code) => {
    return isQuestionCode(code) ? [{ code, topic: QUESTION_TOPIC_BY_CODE[code] }] : [];
  });
}

export function questionListText(lines: readonly string[]): string {
  return lines.map((line, index) => `${String(index + 1)}. ${line}`).join('\n');
}
