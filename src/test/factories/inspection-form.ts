import type { Tables } from '@/lib/supabase/database.types';

type FormCategory = Pick<
  Tables<'inspection_form_categories'>,
  'id' | 'key' | 'position' | 'name_ro' | 'name_en' | 'icon' | 'weight'
>;

type FormQuestion = Pick<
  Tables<'inspection_form_questions'>,
  'id' | 'key' | 'category_id' | 'position' | 'text_ro' | 'text_en' | 'required_media' | 'weight'
>;

type ConsentSection = Pick<
  Tables<'consent_sections'>,
  'id' | 'position' | 'title_ro' | 'title_en' | 'text_ro' | 'text_en' | 'check_ro' | 'check_en'
>;

export function buildFormCategory(overrides: Partial<FormCategory> = {}): FormCategory {
  return {
    id: 'c1',
    key: 'struct',
    position: 0,
    name_ro: 'Structură',
    name_en: 'Structure',
    icon: 'building-2',
    weight: 60,
    ...overrides,
  };
}

export function buildFormQuestion(overrides: Partial<FormQuestion> = {}): FormQuestion {
  return {
    id: 'q1',
    key: 'struct-1',
    category_id: 'c1',
    position: 0,
    text_ro: 'Fisuri vizibile în pereți portanți?',
    text_en: 'Visible cracks in load-bearing walls?',
    required_media: 'photo',
    weight: 100,
    ...overrides,
  };
}

export function buildConsentSection(overrides: Partial<ConsentSection> = {}): ConsentSection {
  return {
    id: 's1',
    position: 0,
    title_ro: 'Prelucrarea datelor personale',
    title_en: 'Personal data processing',
    text_ro: 'Text',
    text_en: 'Text',
    check_ro: 'Sunt de acord.',
    check_en: 'I agree.',
    ...overrides,
  };
}
