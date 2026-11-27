import { getRouteApi } from '@tanstack/react-router';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilIcon,
  PlusIcon,
  ScaleIcon,
  Trash2Icon,
} from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localizedText } from '@/i18n/localized';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { CategoryIcon } from '@/components/inspection/category-icon';
import { EmptyState } from '@/components/layout/empty-state';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  useAddFormQuestion,
  useRemoveFormCategory,
  useReorderFormCategories,
  useSplitQuestionWeights,
} from '../api/inspection-form.queries';
import type { FormCategory, FormQuestion } from '../inspection-form.types';
import { moveItem, WEIGHT_TOTAL } from '../inspection-form.utils';
import { CategoryDialog } from './category-dialog';
import { QuestionEditorCard } from './question-editor-card';

const route = getRouteApi('/_authenticated/admin/content');

type CategoryPanelProps = {
  versionId: string;
  group: { category: FormCategory; questions: (FormQuestion & { number: string })[] };
  categories: readonly FormCategory[];
  questionWeightSum: number;
  isEditable: boolean;
};

export function CategoryPanel({
  versionId,
  group,
  categories,
  questionWeightSum,
  isEditable,
}: CategoryPanelProps) {
  const { t, i18n } = useTranslation('inspectionForm');
  const titleId = useId();
  const navigate = route.useNavigate();
  const [dialog, setDialog] = useState<'edit' | 'remove' | null>(null);
  const reorderCategories = useReorderFormCategories();
  const removeCategory = useRemoveFormCategory();
  const splitWeights = useSplitQuestionWeights();
  const addQuestion = useAddFormQuestion();
  const { category, questions } = group;
  const index = categories.findIndex((item) => item.id === category.id);
  const name = localizedText(category.name_ro, category.name_en, i18n.language);
  const otherName = i18n.language === 'en' ? category.name_ro : category.name_en;
  const isQuestionWeightValid = questionWeightSum === WEIGHT_TOTAL;

  const move = (offset: -1 | 1) => {
    reorderCategories.mutate({
      versionId,
      categoryIds: moveItem(categories, index, offset).map((item) => item.id),
    });
  };

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-card bg-card px-4 py-3.5 shadow-card-soft">
        <span className="grid size-10 shrink-0 place-items-center rounded-thumb bg-surface-alt text-brand">
          <CategoryIcon icon={category.icon} className="size-5" />
        </span>
        <div className="flex min-w-0 flex-[1_1_200px] flex-col">
          <h2 id={titleId} className="text-base font-extrabold">
            {name}
          </h2>
          <span className="text-small text-muted-foreground">
            {[otherName, t('form.category.weightShare', { weight: category.weight })]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        {isEditable ? (
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('form.category.moveUp')}
              disabled={index <= 0 || reorderCategories.isPending}
              onClick={() => {
                move(-1);
              }}
            >
              <ArrowUpIcon aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('form.category.moveDown')}
              disabled={index >= categories.length - 1 || reorderCategories.isPending}
              onClick={() => {
                move(1);
              }}
            >
              <ArrowDownIcon aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDialog('edit');
              }}
            >
              <PencilIcon aria-hidden />
              {t('form.category.edit')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => {
                setDialog('remove');
              }}
            >
              <Trash2Icon aria-hidden />
              {t('form.category.remove')}
            </Button>
          </div>
        ) : null}
      </div>
      {questions.length > 0 ? (
        <Alert tone={isQuestionWeightValid ? 'neutral' : 'warning'}>
          <ScaleIcon aria-hidden />
          <AlertTitle className="tabular-nums">
            {t('form.category.questionWeights', { sum: questionWeightSum })}
          </AlertTitle>
          <AlertDescription>{t('form.category.questionWeightsHint')}</AlertDescription>
          {isEditable ? (
            <AlertAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={splitWeights.isPending}
                aria-busy={splitWeights.isPending}
                onClick={() => {
                  splitWeights.mutate(category.id);
                }}
              >
                {t('form.category.splitEvenly')}
              </Button>
            </AlertAction>
          ) : null}
        </Alert>
      ) : null}
      {questions.length === 0 ? (
        <EmptyState
          title={t('form.question.empty.title')}
          description={t('form.question.empty.description')}
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {questions.map((question, questionIndex) => (
            <li key={question.id}>
              <QuestionEditorCard
                question={question}
                siblings={questions}
                index={questionIndex}
                categories={categories}
                isEditable={isEditable}
              />
            </li>
          ))}
        </ol>
      )}
      {isEditable ? (
        <Button
          type="button"
          variant="outline"
          size="md"
          className="self-start"
          disabled={addQuestion.isPending}
          onClick={() => {
            addQuestion.mutate({ categoryId: category.id, requiredMedia: 'none' });
          }}
        >
          <PlusIcon aria-hidden />
          {t('form.question.add')}
        </Button>
      ) : null}
      {isEditable ? (
        <>
          <CategoryDialog
            versionId={versionId}
            category={category}
            isOpen={dialog === 'edit'}
            onOpenChange={(isOpen) => {
              setDialog(isOpen ? 'edit' : null);
            }}
          />
          <ConfirmDialog
            isOpen={dialog === 'remove'}
            onOpenChange={(isOpen) => {
              setDialog(isOpen ? 'remove' : null);
            }}
            tone="destructive"
            title={t('form.category.removeTitle', { name })}
            description={t('form.category.removeDescription', { count: questions.length })}
            confirmLabel={t('form.category.removeConfirm')}
            pendingLabel={t('form.category.removing')}
            isPending={removeCategory.isPending}
            onConfirm={() => {
              removeCategory.mutate(category.id, {
                onSuccess: () => {
                  setDialog(null);
                  void navigate({
                    search: (previous) => ({ ...previous, category: undefined }),
                    replace: true,
                  });
                },
              });
            }}
          />
        </>
      ) : null}
    </section>
  );
}
