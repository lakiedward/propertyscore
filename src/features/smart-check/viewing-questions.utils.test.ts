import { describe, expect, it } from 'vitest';
import { questionListText, viewingQuestions } from './viewing-questions.utils';

describe('viewingQuestions', () => {
  it('keeps known codes in order and skips unknown ones', () => {
    expect(viewingQuestions(['construction_year', 'nope', 'bedroom_facade_side'])).toEqual([
      { code: 'construction_year', topic: 'seismic' },
      { code: 'bedroom_facade_side', topic: 'noise' },
    ]);
  });
});

describe('questionListText', () => {
  it('numbers the lines', () => {
    expect(questionListText(['a', 'b'])).toBe('1. a\n2. b');
  });
});
