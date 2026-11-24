import { http, HttpResponse } from 'msw';
import type { WorkspaceInspection } from '@/features/field-inspection';
import { supabaseUrl } from '../supabase-url';

function rows(request: Request, items: readonly object[]) {
  const accept = request.headers.get('Accept') ?? '';
  if (accept.includes('vnd.pgrst.object')) {
    return HttpResponse.json(items[0] ?? null);
  }
  return HttpResponse.json(items);
}

const workspaceCategories = [
  {
    id: 'wc1',
    key: 'struct',
    position: 0,
    name_ro: 'Structură',
    name_en: 'Structure',
    icon: 'building-2',
    weight: 60,
  },
  {
    id: 'wc2',
    key: 'umez',
    position: 1,
    name_ro: 'Umezeală',
    name_en: 'Damp',
    icon: 'droplets',
    weight: 40,
  },
];

const workspaceQuestions = [
  {
    id: 'wq1',
    key: 'struct-1',
    category_id: 'wc1',
    position: 0,
    text_ro: 'Fisuri vizibile în pereți portanți?',
    text_en: 'Visible cracks?',
    required_media: 'photo',
  },
  {
    id: 'wq2',
    key: 'umez-1',
    category_id: 'wc2',
    position: 0,
    text_ro: 'Pete sau mucegai?',
    text_en: 'Stains or mould?',
    required_media: 'none',
  },
];

const workspaceSections = [
  {
    id: 'ws1',
    position: 0,
    title_ro: 'Prelucrarea datelor personale',
    title_en: 'Personal data processing',
    text_ro: 'Text RO',
    text_en: 'Text EN',
    check_ro: 'Sunt de acord cu prelucrarea datelor.',
    check_en: 'I agree.',
  },
];

export function workspaceHandlers({
  inspection,
  answers = [],
  consent = null,
  progress = null,
}: {
  inspection: WorkspaceInspection;
  answers?: readonly object[];
  consent?: object | null;
  progress?: object | null;
}) {
  return [
    http.post(supabaseUrl('/rest/v1/rpc/inspector_workspace'), () =>
      HttpResponse.json([inspection]),
    ),
    http.get(supabaseUrl('/rest/v1/inspection_form_versions'), ({ request }) =>
      rows(request, [{ id: 'wv1' }]),
    ),
    http.get(supabaseUrl('/rest/v1/consent_versions'), ({ request }) =>
      rows(request, [{ id: 'cv1', version: 1 }]),
    ),
    http.get(supabaseUrl('/rest/v1/inspection_form_categories'), () =>
      HttpResponse.json(workspaceCategories),
    ),
    http.get(supabaseUrl('/rest/v1/inspection_form_questions'), () =>
      HttpResponse.json(workspaceQuestions),
    ),
    http.get(supabaseUrl('/rest/v1/consent_sections'), () => HttpResponse.json(workspaceSections)),
    http.get(supabaseUrl('/rest/v1/inspection_answers'), () => HttpResponse.json(answers)),
    http.get(supabaseUrl('/rest/v1/inspection_media'), () => HttpResponse.json([])),
    http.get(supabaseUrl('/rest/v1/inspection_consents'), ({ request }) =>
      rows(request, consent ? [consent] : []),
    ),
    http.post(supabaseUrl('/rest/v1/rpc/inspection_progress'), () => HttpResponse.json(progress)),
  ];
}
