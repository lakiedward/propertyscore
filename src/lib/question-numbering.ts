export type NumberedQuestion<Question> = Question & { number: string };

export type QuestionGroup<Category, Question> = {
  category: Category;
  questions: NumberedQuestion<Question>[];
};

export function groupQuestionsByCategory<
  Category extends { id: string },
  Question extends { category_id: string; position: number },
>(
  categories: readonly Category[],
  questions: readonly Question[],
): QuestionGroup<Category, Question>[] {
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
