import { moveItem, parseWeight, questionsByCategory, weightSum } from './inspection-form.utils';
import type { FormCategory, FormQuestion } from './inspection-form.types';

const category = (id: string, position: number): FormCategory => ({
  id,
  key: id,
  position,
  name_ro: id,
  name_en: id,
  icon: 'house',
  weight: 50,
});

const question = (id: string, categoryId: string, position: number): FormQuestion => ({
  id,
  key: id,
  category_id: categoryId,
  position,
  text_ro: id,
  text_en: id,
  required_media: 'none',
});

describe('inspection form utils', () => {
  it('keeps only the digits of a weight and caps it at 100', () => {
    expect(parseWeight('15%')).toBe(15);
    expect(parseWeight('')).toBe(0);
    expect(parseWeight('250')).toBe(100);
    expect(weightSum([15, 15, 70])).toBe(100);
  });

  it('numbers the questions across categories in order', () => {
    const groups = questionsByCategory(
      [category('a', 0), category('b', 1)],
      [question('b1', 'b', 0), question('a2', 'a', 1), question('a1', 'a', 0)],
    );

    expect(
      groups.map((group) => group.questions.map((item) => `${item.id}:${item.number}`)),
    ).toEqual([['a1:01', 'a2:02'], ['b1:03']]);
  });

  it('moves an item within the list and stays inside its bounds', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });
});
