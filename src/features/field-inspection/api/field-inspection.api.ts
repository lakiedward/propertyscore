import type { Locale } from '@/i18n/i18n';
import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { progressSchema } from '../field-inspection.schemas';
import type {
  InspectionAnswer,
  InspectionMediaKind,
  WorkspaceInspection,
} from '../field-inspection.types';

const CATEGORY_COLUMNS = 'id, key, position, name_ro, name_en, icon, weight' as const;

const QUESTION_COLUMNS =
  'id, key, category_id, position, text_ro, text_en, required_media' as const;

const CONSENT_SECTION_COLUMNS =
  'id, position, title_ro, title_en, text_ro, text_en, check_ro, check_en' as const;

const ANSWER_COLUMNS = 'question_id, answer, note' as const;

const MEDIA_COLUMNS = 'id, question_id, kind, path, created_at' as const;

const CONSENT_COLUMNS = 'language, signer_name, signed_at' as const;

const VERSION_ID_COLUMNS = 'id' as const;

const CONSENT_VERSION_NUMBER_COLUMNS = 'version' as const;

async function publishedId(table: 'inspection_form_versions' | 'consent_versions') {
  const { data, error } = await supabase
    .from(table)
    .select(VERSION_ID_COLUMNS)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw toAppError(error);
  return data?.id ?? null;
}

export async function getWorkspace(inspectionId: string) {
  const { data: rows, error } = await supabase.rpc('inspector_workspace', {
    p_inspection_id: inspectionId,
  });
  if (error) throw toAppError(error);
  const inspection: WorkspaceInspection | undefined = rows[0];
  if (!inspection) {
    throw new AppError('not_found', 'Inspection not found for this inspector');
  }

  const [formVersionId, consentVersionId, answers, media, consent] = await Promise.all([
    inspection.form_version_id === null
      ? publishedId('inspection_form_versions')
      : Promise.resolve(inspection.form_version_id),
    inspection.consent_version_id === null
      ? publishedId('consent_versions')
      : Promise.resolve(inspection.consent_version_id),
    supabase.from('inspection_answers').select(ANSWER_COLUMNS).eq('inspection_id', inspectionId),
    supabase
      .from('inspection_media')
      .select(MEDIA_COLUMNS)
      .eq('inspection_id', inspectionId)
      .order('created_at'),
    supabase
      .from('inspection_consents')
      .select(CONSENT_COLUMNS)
      .eq('inspection_id', inspectionId)
      .maybeSingle(),
  ]);
  for (const result of [answers, media, consent]) {
    if (result.error) throw toAppError(result.error);
  }

  return {
    inspection,
    formVersionId,
    consentVersionId,
    answers: answers.data ?? [],
    media: media.data ?? [],
    consent: consent.data,
  };
}

export async function getWorkspaceContent(
  formVersionId: string | null,
  consentVersionId: string | null,
) {
  const [categories, questions, sections, consentVersion] = await Promise.all([
    formVersionId
      ? supabase
          .from('inspection_form_categories')
          .select(CATEGORY_COLUMNS)
          .eq('form_version_id', formVersionId)
          .order('position')
      : Promise.resolve({ data: [], error: null }),
    formVersionId
      ? supabase
          .from('inspection_form_questions')
          .select(QUESTION_COLUMNS)
          .eq('form_version_id', formVersionId)
          .order('position')
      : Promise.resolve({ data: [], error: null }),
    consentVersionId
      ? supabase
          .from('consent_sections')
          .select(CONSENT_SECTION_COLUMNS)
          .eq('consent_version_id', consentVersionId)
          .order('position')
      : Promise.resolve({ data: [], error: null }),
    consentVersionId
      ? supabase
          .from('consent_versions')
          .select(CONSENT_VERSION_NUMBER_COLUMNS)
          .eq('id', consentVersionId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  for (const result of [categories, questions, sections, consentVersion]) {
    if (result.error) throw toAppError(result.error);
  }

  return {
    categories: categories.data ?? [],
    questions: questions.data ?? [],
    sections: sections.data ?? [],
    consentVersion: consentVersion.data?.version ?? null,
  };
}

export async function getProgress(inspectionId: string) {
  const { data, error } = await supabase.rpc('inspection_progress', {
    p_inspection_id: inspectionId,
  });
  if (error) throw toAppError(error);
  return progressSchema.parse(data);
}

export async function startInspection(input: {
  inspectionId: string;
  signerName: string;
  language: Locale;
  signaturePath: string;
  sectionIds: string[];
}) {
  const { error } = await supabase.rpc('start_inspection', {
    p_inspection_id: input.inspectionId,
    p_signer_name: input.signerName,
    p_language: input.language,
    p_signature_path: input.signaturePath,
    p_accepted_section_ids: input.sectionIds,
  });
  if (error) throw toAppError(error);
}

export async function saveAnswer(input: {
  inspectionId: string;
  questionId: string;
  answer: InspectionAnswer | null;
  note: string;
}) {
  const { error } = await supabase.rpc('save_inspection_answer', {
    p_inspection_id: input.inspectionId,
    p_question_id: input.questionId,
    ...(input.answer ? { p_answer: input.answer } : {}),
    p_note: input.note,
  });
  if (error) throw toAppError(error);
}

export async function registerMedia(input: {
  inspectionId: string;
  questionId: string;
  kind: InspectionMediaKind;
  path: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const { data, error } = await supabase.rpc('add_inspection_media', {
    p_inspection_id: input.inspectionId,
    p_question_id: input.questionId,
    p_kind: input.kind,
    p_path: input.path,
    p_mime_type: input.mimeType,
    p_size_bytes: input.sizeBytes,
  });
  if (error) throw toAppError(error);
  return data;
}

export async function unregisterMedia(mediaId: string) {
  const { data, error } = await supabase.rpc('remove_inspection_media', { p_media_id: mediaId });
  if (error) throw toAppError(error);
  return data;
}

export async function submitInspection(input: { inspectionId: string; ownerName: string }) {
  const { error } = await supabase.rpc('submit_inspection', {
    p_inspection_id: input.inspectionId,
    p_owner_name: input.ownerName,
  });
  if (error) throw toAppError(error);
}
