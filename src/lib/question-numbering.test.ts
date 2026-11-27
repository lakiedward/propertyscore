import { groupQuestionsByCategory } from './question-numbering';

describe('groupQuestionsByCategory', () => {
  it('numbers the questions across categories in their order', () => {
    const groups = groupQuestionsByCategory(
      [{ id: 'a' }, { id: 'b' }],
      [
        { id: 'b1', category_id: 'b', position: 0 },
        { id: 'a2', category_id: 'a', position: 1 },
        { id: 'a1', category_id: 'a', position: 0 },
      ],
    );

    expect(
      groups.map((group) => group.questions.map((question) => `${question.id}:${question.number}`)),
    ).toEqual([['a1:01', 'a2:02'], ['b1:03']]);
  });
});
