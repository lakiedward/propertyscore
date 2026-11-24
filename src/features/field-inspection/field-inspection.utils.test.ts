import { canStartAt, groupQuestions, isMediaMissing, scoreTone } from './field-inspection.utils';
import type {
  WorkspaceCategory,
  WorkspaceMedia,
  WorkspaceQuestion,
} from './field-inspection.types';

const category = (id: string, position: number): WorkspaceCategory => ({
  id,
  key: id,
  position,
  name_ro: id,
  name_en: id,
  icon: 'house',
  weight: 50,
});

const question = (
  id: string,
  categoryId: string,
  position: number,
  requiredMedia: WorkspaceQuestion['required_media'] = 'none',
): WorkspaceQuestion => ({
  id,
  key: id,
  category_id: categoryId,
  position,
  text_ro: id,
  text_en: id,
  required_media: requiredMedia,
});

describe('field inspection utils', () => {
  it('numbers the questions across the categories', () => {
    const groups = groupQuestions(
      [category('a', 0), category('b', 1)],
      [question('b1', 'b', 0), question('a1', 'a', 0)],
    );
    expect(groups.flatMap((group) => group.questions.map((item) => item.number))).toEqual([
      '01',
      '02',
    ]);
  });

  it('asks for the required media unless the answer is N/A', () => {
    const photo = question('q', 'a', 0, 'photo');
    const media: WorkspaceMedia[] = [
      { id: 'm', question_id: 'q', kind: 'video', path: 'p', created_at: '2026-11-24T08:00:00Z' },
    ];
    expect(isMediaMissing(photo, 'good', media)).toBe(true);
    expect(isMediaMissing(photo, 'not_applicable', media)).toBe(false);
    expect(isMediaMissing(question('n', 'a', 0), 'problem', [])).toBe(false);
  });

  it('lets an inspection start on its day from one hour before', () => {
    const startsAt = '2026-11-24T10:00:00.000Z';
    expect(canStartAt(startsAt, new Date('2026-11-24T08:30:00.000Z'))).toBe(false);
    expect(canStartAt(startsAt, new Date('2026-11-24T09:10:00.000Z'))).toBe(true);
    expect(canStartAt(startsAt, new Date('2026-11-25T09:10:00.000Z'))).toBe(false);
  });

  it('colours a score by band', () => {
    expect(scoreTone(8.4)).toBe('text-success');
    expect(scoreTone(6.5)).toBe('text-warning');
    expect(scoreTone(3)).toBe('text-destructive');
    expect(scoreTone(null)).toBe('text-muted-foreground');
  });
});
