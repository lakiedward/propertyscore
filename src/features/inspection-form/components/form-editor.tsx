import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { localizedText } from '@/i18n/localized';
import { EmptyState } from '@/components/layout/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { groupQuestionsByCategory } from '@/lib/question-numbering';
import {
  inspectionFormQueries,
  useCreateFormDraft,
  useDeleteFormVersion,
  useRestoreFormVersion,
} from '../api/inspection-form.queries';
import { useVersionHistory } from '../hooks/use-version-history';
import {
  nextFormVersion,
  parseWeight,
  questionWeightTotals,
  toVersionItems,
  WEIGHT_TOTAL,
  weightSum,
} from '../inspection-form.utils';
import { AnswerPointsCard } from './answer-points-card';
import { CategoryList } from './category-list';
import { CategoryPanel } from './category-panel';
import { FormHeaderCard } from './form-header-card';
import { VersionBanner } from './version-banner';
import { VersionDialogs } from './version-dialogs';
import { VersionList } from './version-list';

const route = getRouteApi('/_authenticated/admin/content');

export type WeightValues = { weights: Record<string, string> };

export function FormEditor() {
  const { t, i18n } = useTranslation('inspectionForm');
  const search = route.useSearch();
  const viewedId = search.tab === 'form' ? (search.version ?? null) : null;
  const { data: editor } = useSuspenseQuery(inspectionFormQueries.editor(viewedId));
  const createDraft = useCreateFormDraft();
  const defaultVersion = editor.draft ?? editor.published;
  const label = (version: number) => t('versions.label', { version });
  const items = toVersionItems(editor.versions, editor.usageCounts, label);
  const nextLabel = label(nextFormVersion(editor.versions));
  const history = useVersionHistory({
    defaultId: defaultVersion?.id ?? null,
    nextLabel,
    restore: useRestoreFormVersion(),
    remove: useDeleteFormVersion(),
  });
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

  const isDraft = editor.shown.status === 'draft';
  const questionTotals = questionWeightTotals(editor.questions);
  const unbalancedCategories = editor.categories.filter(
    (category) =>
      questionTotals[category.id] !== undefined && questionTotals[category.id] !== WEIGHT_TOTAL,
  );
  const isViewing = editor.shown.id !== defaultVersion?.id;
  const shownItem = items.find((item) => item.id === editor.shown.id);

  return (
    <div className="flex flex-col gap-4">
      {isViewing && shownItem ? (
        <VersionBanner
          item={shownItem}
          backLabel={t(editor.draft ? 'versions.backToDraft' : 'versions.backToPublished')}
          onBack={() => {
            history.view(null);
          }}
          onRestore={() => {
            history.setRequest({ kind: 'restore', item: shownItem });
          }}
        />
      ) : (
        <FormHeaderCard
          editor={editor}
          weightSum={sum}
          hasQuestionWeightIssues={unbalancedCategories.length > 0}
        />
      )}
      {isDraft && sum !== WEIGHT_TOTAL ? (
        <Alert tone="warning">
          <AlertTitle>{t('form.weightsInvalid.title')}</AlertTitle>
          <AlertDescription>{t('form.weightsInvalid.text', { sum })}</AlertDescription>
        </Alert>
      ) : null}
      {isDraft && unbalancedCategories.length > 0 ? (
        <Alert tone="warning">
          <AlertTitle>{t('form.questionWeightsInvalid.title')}</AlertTitle>
          <AlertDescription>
            {t('form.questionWeightsInvalid.text', {
              categories: unbalancedCategories
                .map((category) => localizedText(category.name_ro, category.name_en, i18n.language))
                .join(', '),
            })}
          </AlertDescription>
        </Alert>
      ) : null}
      {isDraft || isViewing ? null : (
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
            questionTotals={questionTotals}
            isEditable={isDraft}
          />
          <AnswerPointsCard key={editor.shown.id} version={editor.shown} isEditable={isDraft} />
          <VersionList
            items={items}
            shownId={editor.shown.id}
            onView={history.view}
            onRequest={history.setRequest}
          />
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
      <VersionDialogs
        request={history.request}
        nextLabel={nextLabel}
        hasDraft={editor.draft !== null}
        isPending={history.isPending}
        onClose={() => {
          history.setRequest(null);
        }}
        onConfirm={history.confirm}
      />
    </div>
  );
}
