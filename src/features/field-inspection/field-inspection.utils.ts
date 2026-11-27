import { formatNumber } from '@/i18n/format';
import type {
  NumberedQuestion as NumberedQuestionOf,
  QuestionGroup,
} from '@/lib/question-numbering';
import type {
  InspectionAnswer,
  WorkspaceAnswer,
  WorkspaceCategory,
  WorkspaceMedia,
  WorkspaceQuestion,
} from './field-inspection.types';

export type NumberedQuestion = NumberedQuestionOf<WorkspaceQuestion>;

export type CategoryGroup = QuestionGroup<WorkspaceCategory, WorkspaceQuestion>;

export function answerOf(answers: readonly WorkspaceAnswer[], questionId: string) {
  return answers.find((answer) => answer.question_id === questionId);
}

export function mediaOf(media: readonly WorkspaceMedia[], questionId: string) {
  return media.filter((item) => item.question_id === questionId);
}

export function isMediaMissing(
  question: WorkspaceQuestion,
  answer: InspectionAnswer | null | undefined,
  media: readonly WorkspaceMedia[],
): boolean {
  if (question.required_media === 'none' || answer === 'not_applicable') {
    return false;
  }
  return !media.some(
    (item) => item.question_id === question.id && item.kind === question.required_media,
  );
}

export function firstCategoryWith(
  groups: readonly CategoryGroup[],
  isPending: (question: NumberedQuestion) => boolean,
): WorkspaceCategory | undefined {
  return groups.find((group) => group.questions.some(isPending))?.category;
}

export function scoreTone(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return 'text-muted-foreground';
  }
  if (score >= 8) {
    return 'text-success';
  }
  return score >= 5 ? 'text-warning' : 'text-destructive';
}

const ONE_DECIMAL = { minimumFractionDigits: 1, maximumFractionDigits: 1 } as const;

export function formatInspectionScore(score: number): string {
  return formatNumber(score, ONE_DECIMAL);
}
