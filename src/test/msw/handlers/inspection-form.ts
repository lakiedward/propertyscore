import { http, HttpResponse } from 'msw';
import { supabaseUrl } from '../supabase-url';

const VERSION_ID = 'f1000000-0000-4000-8000-000000000001';

export const publishedFormVersion = {
  id: VERSION_ID,
  version: 3,
  status: 'published',
  published_at: '2026-09-01T09:00:00+03:00',
  points_good: 10,
  points_acceptable: 6.5,
  points_problem: 3,
};

const formCategories = [
  {
    id: 'c1',
    key: 'struct',
    position: 0,
    name_ro: 'Structură',
    name_en: 'Structure',
    icon: 'building-2',
    weight: 60,
  },
  {
    id: 'c2',
    key: 'umez',
    position: 1,
    name_ro: 'Umezeală',
    name_en: 'Damp',
    icon: 'droplets',
    weight: 40,
  },
];

const formQuestions = [
  {
    id: 'q1',
    key: 'struct-1',
    category_id: 'c1',
    position: 0,
    text_ro: 'Fisuri vizibile în pereți portanți?',
    text_en: 'Visible cracks in load-bearing walls?',
    required_media: 'photo',
  },
  {
    id: 'q2',
    key: 'umez-1',
    category_id: 'c2',
    position: 0,
    text_ro: 'Pete sau mucegai?',
    text_en: '',
    required_media: 'none',
  },
];

export function formCategoriesResponse(categories: readonly object[]) {
  return http.get(supabaseUrl('/rest/v1/inspection_form_categories'), () =>
    HttpResponse.json(categories),
  );
}

export { formCategories };

export function formVersionsResponse(versions: readonly object[]) {
  return http.get(supabaseUrl('/rest/v1/inspection_form_versions'), () =>
    HttpResponse.json(versions),
  );
}

export const inspectionFormHandlers = [
  http.patch(supabaseUrl('/rest/v1/inspection_form_questions'), () =>
    HttpResponse.json([{ id: 'q2' }]),
  ),
  http.patch(supabaseUrl('/rest/v1/inspection_form_categories'), () =>
    HttpResponse.json([{ id: 'c1' }]),
  ),
  http.post(supabaseUrl('/rest/v1/rpc/add_inspection_form_category'), () =>
    HttpResponse.json('c3'),
  ),
  formVersionsResponse([publishedFormVersion]),
  http.get(supabaseUrl('/rest/v1/inspection_form_categories'), () =>
    HttpResponse.json(formCategories),
  ),
  http.head(
    supabaseUrl('/rest/v1/inspection_form_categories'),
    () =>
      new HttpResponse(null, {
        headers: { 'Content-Range': `*/${String(formCategories.length)}` },
      }),
  ),
  http.get(supabaseUrl('/rest/v1/inspection_form_questions'), () =>
    HttpResponse.json(formQuestions),
  ),
  http.head(
    supabaseUrl('/rest/v1/inspection_form_questions'),
    () =>
      new HttpResponse(null, { headers: { 'Content-Range': `*/${String(formQuestions.length)}` } }),
  ),
  http.get(supabaseUrl('/rest/v1/consent_versions'), () =>
    HttpResponse.json([
      {
        id: 'cv1',
        version: 1,
        status: 'published',
        published_at: '2026-09-01T09:00:00+03:00',
        archived_at: null,
        updated_at: '2026-09-01T09:00:00+03:00',
      },
    ]),
  ),
  http.get(supabaseUrl('/rest/v1/consent_sections'), () =>
    HttpResponse.json([
      {
        id: 's1',
        position: 0,
        title_ro: 'Prelucrarea datelor personale',
        title_en: 'Personal data processing',
        text_ro: 'Text',
        text_en: 'Text',
        check_ro: 'Sunt de acord.',
        check_en: 'I agree.',
      },
    ]),
  ),
];
