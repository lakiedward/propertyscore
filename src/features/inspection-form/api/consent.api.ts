import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type { ConsentSectionPatch } from '../inspection-form.types';

const CONSENT_VERSION_COLUMNS =
  'id, version, status, published_at, archived_at, updated_at' as const;

const CONSENT_SECTION_COLUMNS =
  'id, position, title_ro, title_en, text_ro, text_en, check_ro, check_en' as const;

export async function getConsentEditor() {
  const { data: versions, error } = await supabase
    .from('consent_versions')
    .select(CONSENT_VERSION_COLUMNS)
    .order('version', { ascending: false });
  if (error) throw toAppError(error);

  const draft = versions.find((version) => version.status === 'draft') ?? null;
  const published = versions.find((version) => version.status === 'published') ?? null;
  const shown = draft ?? published;

  if (!shown) {
    return { versions, draft, published, shown, sections: [] };
  }

  const { data: sections, error: sectionsError } = await supabase
    .from('consent_sections')
    .select(CONSENT_SECTION_COLUMNS)
    .eq('consent_version_id', shown.id)
    .order('position');
  if (sectionsError) throw toAppError(sectionsError);

  return { versions, draft, published, shown, sections };
}

export async function createConsentDraft() {
  const { data, error } = await supabase.rpc('create_consent_draft');
  if (error) throw toAppError(error);
  return data;
}

export async function discardConsentDraft(versionId: string) {
  const { error } = await supabase.rpc('discard_consent_draft', {
    p_consent_version_id: versionId,
  });
  if (error) throw toAppError(error);
}

export async function publishConsent(versionId: string) {
  const { error } = await supabase.rpc('publish_consent_version', {
    p_consent_version_id: versionId,
  });
  if (error) throw toAppError(error);
}

export async function addConsentSection(versionId: string) {
  const { data, error } = await supabase.rpc('add_consent_section', {
    p_consent_version_id: versionId,
  });
  if (error) throw toAppError(error);
  return data;
}

export async function removeConsentSection(sectionId: string) {
  const { error } = await supabase.rpc('remove_consent_section', { p_section_id: sectionId });
  if (error) throw toAppError(error);
}

export async function saveConsentSections(sections: readonly ConsentSectionPatch[]) {
  for (const { id, ...patch } of sections) {
    const { error } = await supabase.from('consent_sections').update(patch).eq('id', id);
    if (error) throw toAppError(error);
  }
}
