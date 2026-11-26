import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type {
  CategoryInput,
  PointsPatch,
  QuestionPatch,
  RequiredMedia,
} from '../inspection-form.types';

const UPDATED_COLUMNS = 'id' as const;

function assertDraftUpdated(rows: readonly unknown[]) {
  if (rows.length === 0) {
    throw new AppError('validation', 'The form is no longer a draft', { reason: 'form_not_draft' });
  }
}

const VERSION_COLUMNS =
  'id, version, status, published_at, archived_at, updated_at, points_good, points_acceptable, points_problem' as const;

const CATEGORY_COLUMNS = 'id, key, position, name_ro, name_en, icon, weight' as const;

const QUESTION_COLUMNS =
  'id, key, category_id, position, text_ro, text_en, required_media, weight' as const;

async function countRows(
  table: 'inspection_form_categories' | 'inspection_form_questions',
  versionId: string,
) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('form_version_id', versionId);
  if (error) throw toAppError(error);
  return count ?? 0;
}

export async function getFormEditor(viewedId: string | null) {
  const [{ data: versions, error }, usage] = await Promise.all([
    supabase
      .from('inspection_form_versions')
      .select(VERSION_COLUMNS)
      .order('version', { ascending: false }),
    supabase.rpc('inspection_form_version_usage'),
  ]);
  if (error) throw toAppError(error);
  if (usage.error) throw toAppError(usage.error);

  const draft = versions.find((version) => version.status === 'draft') ?? null;
  const published = versions.find((version) => version.status === 'published') ?? null;
  const viewed = versions.find((version) => version.id === viewedId) ?? null;
  const shown = viewed ?? draft ?? published;
  const usageCounts = Object.fromEntries(
    usage.data.map((row) => [row.form_version_id, row.inspection_count]),
  );

  if (!shown) {
    return {
      versions,
      draft,
      published,
      shown,
      usageCounts,
      publishedCounts: null,
      categories: [],
      questions: [],
    };
  }

  const [categories, questions, publishedCounts] = await Promise.all([
    supabase
      .from('inspection_form_categories')
      .select(CATEGORY_COLUMNS)
      .eq('form_version_id', shown.id)
      .order('position'),
    supabase
      .from('inspection_form_questions')
      .select(QUESTION_COLUMNS)
      .eq('form_version_id', shown.id)
      .order('position'),
    published
      ? Promise.all([
          countRows('inspection_form_categories', published.id),
          countRows('inspection_form_questions', published.id),
        ])
      : Promise.resolve(null),
  ]);
  if (categories.error) throw toAppError(categories.error);
  if (questions.error) throw toAppError(questions.error);

  return {
    versions,
    draft,
    published,
    shown,
    usageCounts,
    publishedCounts: publishedCounts
      ? { categories: publishedCounts[0], questions: publishedCounts[1] }
      : null,
    categories: categories.data,
    questions: questions.data,
  };
}

export async function createFormDraft() {
  const { data, error } = await supabase.rpc('create_inspection_form_draft');
  if (error) throw toAppError(error);
  return data;
}

export async function restoreFormVersion(versionId: string) {
  const { data, error } = await supabase.rpc('restore_inspection_form_version', {
    p_form_version_id: versionId,
  });
  if (error) throw toAppError(error);
  return data;
}

export async function deleteFormVersion(versionId: string) {
  const { error } = await supabase.rpc('delete_inspection_form_version', {
    p_form_version_id: versionId,
  });
  if (error) throw toAppError(error);
}

export async function splitQuestionWeights(categoryId: string) {
  const { error } = await supabase.rpc('split_inspection_form_question_weights', {
    p_category_id: categoryId,
  });
  if (error) throw toAppError(error);
}

export async function discardFormDraft(versionId: string) {
  const { error } = await supabase.rpc('discard_inspection_form_draft', {
    p_form_version_id: versionId,
  });
  if (error) throw toAppError(error);
}

export async function publishForm(versionId: string) {
  const { error } = await supabase.rpc('publish_inspection_form', { p_form_version_id: versionId });
  if (error) throw toAppError(error);
}

export async function updateFormPoints({
  versionId,
  points,
}: {
  versionId: string;
  points: PointsPatch;
}) {
  const { data, error } = await supabase
    .from('inspection_form_versions')
    .update(points)
    .eq('id', versionId)
    .select(UPDATED_COLUMNS);
  if (error) throw toAppError(error);
  assertDraftUpdated(data);
}

export async function addFormCategory({
  versionId,
  category,
}: {
  versionId: string;
  category: CategoryInput;
}) {
  const { data, error } = await supabase.rpc('add_inspection_form_category', {
    p_form_version_id: versionId,
    p_name_ro: category.nameRo,
    p_name_en: category.nameEn,
    p_icon: category.icon,
  });
  if (error) throw toAppError(error);
  return data;
}

export async function updateFormCategory({
  categoryId,
  patch,
}: {
  categoryId: string;
  patch: { name_ro?: string; name_en?: string; icon?: string; weight?: number };
}) {
  const { data, error } = await supabase
    .from('inspection_form_categories')
    .update(patch)
    .eq('id', categoryId)
    .select(UPDATED_COLUMNS);
  if (error) throw toAppError(error);
  assertDraftUpdated(data);
}

export async function removeFormCategory(categoryId: string) {
  const { error } = await supabase.rpc('remove_inspection_form_category', {
    p_category_id: categoryId,
  });
  if (error) throw toAppError(error);
}

export async function reorderFormCategories({
  versionId,
  categoryIds,
}: {
  versionId: string;
  categoryIds: string[];
}) {
  const { error } = await supabase.rpc('reorder_inspection_form_categories', {
    p_form_version_id: versionId,
    p_category_ids: categoryIds,
  });
  if (error) throw toAppError(error);
}

export async function addFormQuestion({
  categoryId,
  requiredMedia,
}: {
  categoryId: string;
  requiredMedia: RequiredMedia;
}) {
  const { data, error } = await supabase.rpc('add_inspection_form_question', {
    p_category_id: categoryId,
    p_text_ro: '',
    p_text_en: '',
    p_required_media: requiredMedia,
  });
  if (error) throw toAppError(error);
  return data;
}

export async function updateFormQuestion({
  questionId,
  patch,
}: {
  questionId: string;
  patch: QuestionPatch;
}) {
  const { data, error } = await supabase
    .from('inspection_form_questions')
    .update(patch)
    .eq('id', questionId)
    .select(UPDATED_COLUMNS);
  if (error) throw toAppError(error);
  assertDraftUpdated(data);
}

export async function removeFormQuestion(questionId: string) {
  const { error } = await supabase.rpc('remove_inspection_form_question', {
    p_question_id: questionId,
  });
  if (error) throw toAppError(error);
}

export async function reorderFormQuestions({
  categoryId,
  questionIds,
}: {
  categoryId: string;
  questionIds: string[];
}) {
  const { error } = await supabase.rpc('reorder_inspection_form_questions', {
    p_category_id: categoryId,
    p_question_ids: questionIds,
  });
  if (error) throw toAppError(error);
}

export async function moveFormQuestion({
  questionId,
  categoryId,
}: {
  questionId: string;
  categoryId: string;
}) {
  const { error } = await supabase.rpc('move_inspection_form_question', {
    p_question_id: questionId,
    p_category_id: categoryId,
  });
  if (error) throw toAppError(error);
}
