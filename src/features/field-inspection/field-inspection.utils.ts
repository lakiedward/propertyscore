import type {
  InspectionAnswer,
  WorkspaceAnswer,
  WorkspaceCategory,
  WorkspaceMedia,
  WorkspaceQuestion,
} from './field-inspection.types';

export type NumberedQuestion = WorkspaceQuestion & { number: string };

export type CategoryGroup = { category: WorkspaceCategory; questions: NumberedQuestion[] };

export function groupQuestions(
  categories: readonly WorkspaceCategory[],
  questions: readonly WorkspaceQuestion[],
): CategoryGroup[] {
  let number = 0;
  return categories.map((category) => ({
    category,
    questions: questions
      .filter((question) => question.category_id === category.id)
      .toSorted((first, second) => first.position - second.position)
      .map((question) => {
        number += 1;
        return { ...question, number: String(number).padStart(2, '0') };
      }),
  }));
}

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

export function canStartAt(startsAt: string, now: Date): boolean {
  const start = new Date(startsAt);
  const day = (value: Date) => value.toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
  return day(start) === day(now) && now.getTime() >= start.getTime() - 3_600_000;
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
