import { changeLocale } from '@/i18n/i18n';
import { formatInspectionScore, isMediaMissing, scoreTone } from './field-inspection.utils';
import type { WorkspaceMedia, WorkspaceQuestion } from './field-inspection.types';

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
  it('asks for the required media unless the answer is N/A', () => {
    const photo = question('q', 'a', 0, 'photo');
    const media: WorkspaceMedia[] = [
      { id: 'm', question_id: 'q', kind: 'video', path: 'p', created_at: '2026-11-24T08:00:00Z' },
    ];
    expect(isMediaMissing(photo, 'good', media)).toBe(true);
    expect(isMediaMissing(photo, 'not_applicable', media)).toBe(false);
    expect(isMediaMissing(question('n', 'a', 0), 'problem', [])).toBe(false);
  });

  it('colours a score by band', () => {
    expect(scoreTone(8.4)).toBe('text-success');
    expect(scoreTone(6.5)).toBe('text-warning');
    expect(scoreTone(3)).toBe('text-destructive');
    expect(scoreTone(null)).toBe('text-muted-foreground');
  });

  it('formats a score with one decimal in the current language', async () => {
    expect(formatInspectionScore(8)).toBe('8,0');
    expect(formatInspectionScore(6.54)).toBe('6,5');
    await changeLocale('en');
    expect(formatInspectionScore(8)).toBe('8.0');
    await changeLocale('ro');
  });
});
