import { validationMessage } from '@/i18n/validation';
import { contentSearchSchema } from './inspection-form.search';
import {
  categorySchema,
  consentSectionsSchema,
  pointsSchema,
  questionSchema,
  weightsSchema,
} from './inspection-form.schemas';

const SECTION = {
  id: 's1',
  title_ro: 'Titlu',
  title_en: 'Title',
  text_ro: 'Text',
  text_en: 'Text',
  check_ro: 'Sunt de acord.',
  check_en: 'I agree.',
};

function issuePaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((issue) => issue.path.join('.')) ?? [];
}

describe('inspection form schemas', () => {
  it('accepts answer points from good down to problem', () => {
    expect(pointsSchema.safeParse({ good: 10, acceptable: 6.5, problem: 3 }).success).toBe(true);
    expect(pointsSchema.safeParse({ good: 5, acceptable: 5, problem: 5 }).success).toBe(true);
  });

  it('refuses points out of order on the acceptable field', () => {
    const result = pointsSchema.safeParse({ good: 5, acceptable: 7, problem: 3 });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(['acceptable']);
    expect(result.error?.issues[0]?.message).toBe(validationMessage('invalid'));
  });

  it('refuses points outside 0 to 10', () => {
    expect(pointsSchema.safeParse({ good: 11, acceptable: 6, problem: 3 }).success).toBe(false);
    expect(pointsSchema.safeParse({ good: 10, acceptable: 6, problem: -1 }).success).toBe(false);
  });

  it('requires a Romanian category name and caps both names at 60 characters', () => {
    const valid = { nameRo: 'Structură', nameEn: '', icon: 'building-2' };
    expect(categorySchema.safeParse(valid).success).toBe(true);
    expect(issuePaths(categorySchema.safeParse({ ...valid, nameRo: '   ' }))).toEqual(['nameRo']);
    expect(issuePaths(categorySchema.safeParse({ ...valid, nameRo: 'a'.repeat(61) }))).toEqual([
      'nameRo',
    ]);
    expect(issuePaths(categorySchema.safeParse({ ...valid, nameEn: 'a'.repeat(61) }))).toEqual([
      'nameEn',
    ]);
    expect(categorySchema.safeParse({ ...valid, nameRo: 'a'.repeat(60) }).success).toBe(true);
  });

  it('caps the question texts at 300 characters', () => {
    const valid = { textRo: 'Întrebare', textEn: '', requiredMedia: 'photo', weight: '100' };
    expect(questionSchema.safeParse(valid).success).toBe(true);
    expect(issuePaths(questionSchema.safeParse({ ...valid, textRo: 'a'.repeat(301) }))).toEqual([
      'textRo',
    ]);
    expect(issuePaths(questionSchema.safeParse({ ...valid, textEn: 'a'.repeat(301) }))).toEqual([
      'textEn',
    ]);
  });

  it('caps the consent title, text and check label', () => {
    expect(consentSectionsSchema.safeParse({ sections: [SECTION] }).success).toBe(true);
    const tooLong = {
      ...SECTION,
      title_en: 'a'.repeat(121),
      text_ro: 'a'.repeat(3001),
      check_ro: 'a'.repeat(201),
    };
    expect(issuePaths(consentSectionsSchema.safeParse({ sections: [tooLong] }))).toEqual([
      'sections.0.title_en',
      'sections.0.text_ro',
      'sections.0.check_ro',
    ]);
  });

  it('keeps the category weights as text per category', () => {
    expect(weightsSchema.safeParse({ weights: { c1: '60', c2: '40' } }).success).toBe(true);
    expect(weightsSchema.safeParse({ weights: { c1: 60 } }).success).toBe(false);
  });

  it('falls back to the consent tab in Romanian and drops a version that is not a uuid', () => {
    expect(contentSearchSchema.parse({})).toEqual({ tab: 'consent', lang: 'ro' });
    expect(contentSearchSchema.parse({ tab: 'other', lang: 'de', version: 'v2' })).toEqual({
      tab: 'consent',
      lang: 'ro',
    });
    const version = 'f1000000-0000-4000-8000-000000000002';
    expect(contentSearchSchema.parse({ tab: 'form', lang: 'en', version })).toEqual({
      tab: 'form',
      lang: 'en',
      version,
    });
  });
});
