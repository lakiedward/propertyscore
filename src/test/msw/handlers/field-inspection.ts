import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import type { WorkspaceInspection } from '@/features/field-inspection';
import {
  buildConsentSection,
  buildFormCategory,
  buildFormQuestion,
} from '@/test/factories/inspection-form';
import { postgrestRows } from '@/test/msw/postgrest-rows';
import { supabaseUrl } from '../supabase-url';

const signRequestSchema = z.object({ paths: z.array(z.string()) });

export const workspaceCategories = [
  buildFormCategory({ id: 'wc1' }),
  buildFormCategory({
    id: 'wc2',
    key: 'umez',
    position: 1,
    name_ro: 'Umezeală',
    name_en: 'Damp',
    icon: 'droplets',
    weight: 40,
  }),
];

export const workspaceQuestions = [
  buildFormQuestion({ id: 'wq1', category_id: 'wc1' }),
  buildFormQuestion({
    id: 'wq2',
    key: 'umez-1',
    category_id: 'wc2',
    text_ro: 'Pete sau mucegai?',
    text_en: 'Stains or mould?',
    required_media: 'none',
  }),
];

export const workspaceSections = [
  buildConsentSection({
    id: 'ws1',
    text_ro: 'Text RO',
    text_en: 'Text EN',
    check_ro: 'Sunt de acord cu prelucrarea datelor.',
  }),
];

export function workspaceHandlers({
  inspection,
  answers = [],
  media = [],
  consent = null,
  progress = null,
}: {
  inspection: WorkspaceInspection;
  answers?: readonly object[];
  media?: readonly object[];
  consent?: object | null;
  progress?: object | null;
}) {
  return [
    http.post(supabaseUrl('/rest/v1/rpc/inspector_workspace'), () =>
      HttpResponse.json([inspection]),
    ),
    http.get(supabaseUrl('/rest/v1/inspection_form_versions'), ({ request }) =>
      postgrestRows(request, [{ id: 'wv1' }]),
    ),
    http.get(supabaseUrl('/rest/v1/consent_versions'), ({ request }) =>
      postgrestRows(request, [{ id: 'cv1', version: 1 }]),
    ),
    http.get(supabaseUrl('/rest/v1/inspection_form_categories'), () =>
      HttpResponse.json(workspaceCategories),
    ),
    http.get(supabaseUrl('/rest/v1/inspection_form_questions'), () =>
      HttpResponse.json(workspaceQuestions),
    ),
    http.get(supabaseUrl('/rest/v1/consent_sections'), () => HttpResponse.json(workspaceSections)),
    http.get(supabaseUrl('/rest/v1/inspection_answers'), () => HttpResponse.json(answers)),
    http.get(supabaseUrl('/rest/v1/inspection_media'), () => HttpResponse.json(media)),
    http.get(supabaseUrl('/rest/v1/inspection_consents'), ({ request }) =>
      postgrestRows(request, consent ? [consent] : []),
    ),
    http.post(supabaseUrl('/rest/v1/rpc/inspection_progress'), () => HttpResponse.json(progress)),
    http.post(
      supabaseUrl('/rest/v1/rpc/save_inspection_answer'),
      () => new HttpResponse(null, { status: 204 }),
    ),
    http.post(
      supabaseUrl('/rest/v1/rpc/submit_inspection'),
      () => new HttpResponse(null, { status: 204 }),
    ),
    http.post(supabaseUrl('/storage/v1/object/sign/inspection-media'), async ({ request }) => {
      const { paths } = signRequestSchema.parse(await request.json());
      return HttpResponse.json(
        paths.map((path) => ({
          path,
          signedURL: `/object/sign/inspection-media/${path}?token=t`,
          error: null,
        })),
      );
    }),
  ];
}
