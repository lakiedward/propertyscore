import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { groupQuestionsByCategory } from '@/lib/question-numbering';
import { inspectionFormQueries, useCreateFormDraft } from '../api/inspection-form.queries';
import { parseWeight, WEIGHT_TOTAL, weightSum } from '../inspection-form.utils';
import { AnswerPointsCard } from './answer-points-card';
import { CategoryList } from './category-list';
import { CategoryPanel } from './category-panel';
import { FormHeaderCard } from './form-header-card';

const route = getRouteApi('/_authenticated/admin/content');

export type WeightValues = { weights: Record<string, string> };

export function FormEditor() {
  const { t } = useTranslation('inspectionForm');
  const search = route.useSearch();
  const { data: editor } = useSuspenseQuery(inspectionFormQueries.editor());
  const createDraft = useCreateFormDraft();
  const weightsForm = useForm<WeightValues>({
    values: {
      weights: Object.fromEntries(
        editor.categories.map((category) => [category.id, String(category.weight)]),
      ),
    },
    resetOptions: { keepDirtyValues: true },
  });
  const weights = useWatch({ control: weightsForm.control, name: 'weights' });
  const sum = weightSum(
    editor.categories.map((category) =>
      parseWeight(weights[category.id] ?? String(category.weight)),
    ),
  );
  const groups = groupQuestionsByCategory(editor.categories, editor.questions);
  const selected = groups.find((group) => group.category.key === search.category) ?? groups[0];

  if (!editor.shown) {
    return (
      <EmptyState
        title={t('form.empty.title')}
        description={t('form.empty.description')}
        action={
          <Button
            type="button"
            size="md"
            disabled={createDraft.isPending}
            onClick={() => {
              createDraft.mutate();
            }}
          >
            {t('form.createDraft')}
          </Button>
        }
      />
    );
  }

  const isDraft = editor.draft !== null;

  return (
    <div className="flex flex-col gap-4">
      <FormHeaderCard editor={editor} weightSum={sum} />
      {isDraft && sum !== WEIGHT_TOTAL ? (
        <Alert tone="warning">
          <AlertTitle>{t('form.weightsInvalid.title')}</AlertTitle>
          <AlertDescription>{t('form.weightsInvalid.text', { sum })}</AlertDescription>
        </Alert>
      ) : null}
      {isDraft ? null : (
        <Alert tone="info">
          <AlertTitle>{t('form.readOnly.title')}</AlertTitle>
          <AlertDescription>{t('form.readOnly.text')}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 items-start gap-4 w1180:grid-cols-[280px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <CategoryList
            versionId={editor.shown.id}
            categories={editor.categories}
            selectedId={selected?.category.id}
            control={weightsForm.control}
            isEditable={isDraft}
          />
          <AnswerPointsCard key={editor.shown.id} version={editor.shown} isEditable={isDraft} />
        </div>
        {selected ? (
          <CategoryPanel
            versionId={editor.shown.id}
            group={selected}
            categories={editor.categories}
            isEditable={isDraft}
          />
        ) : (
          <EmptyState title={t('form.empty.title')} description={t('form.empty.description')} />
        )}
      </div>
    </div>
  );
}
