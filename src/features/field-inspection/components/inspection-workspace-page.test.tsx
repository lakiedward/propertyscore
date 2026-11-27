import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/fieldInspection.json';
import { signedInAs } from '@/test/factories/auth';
import { buildWorkspaceInspection } from '@/test/factories/field-inspection';
import {
  workspaceCategories,
  workspaceHandlers,
  workspaceQuestions,
  workspaceSections,
} from '@/test/msw/handlers/field-inspection';
import { postgrestErrorResponse } from '@/test/msw/postgrest-error';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

const NOW = new Date('2026-11-24T07:00:00.000Z');

const [firstQuestion] = workspaceQuestions;
const [firstSection] = workspaceSections;
const [firstCategory, secondCategory] = workspaceCategories;

const CONSENT = {
  language: 'ro',
  signer_name: 'D. Popescu',
  signed_at: '2026-11-24T07:20:00.000Z',
};

const PROGRESS = {
  answered: 2,
  total: 2,
  photos: 1,
  videos: 0,
  missing_media: 0,
  score: 8.5,
  categories: [
    { category_id: 'wc1', answered: 1, total: 1, score: 10 },
    { category_id: 'wc2', answered: 1, total: 1, score: 6.5 },
  ],
};

const INSPECTION_ID = buildWorkspaceInspection().id;

const PHOTO = {
  id: 'm1',
  question_id: 'wq1',
  kind: 'photo',
  path: `${INSPECTION_ID}/question/photo-1.webp`,
  created_at: '2026-11-24T07:25:00.000Z',
};

const fakeContext = {
  setTransform: () => undefined,
  beginPath: () => undefined,
  moveTo: () => undefined,
  lineTo: () => undefined,
  stroke: () => undefined,
  clearRect: () => undefined,
  drawImage: () => undefined,
};

const prototypeOverrides = ['getContext', 'toBlob', 'setPointerCapture'] as const;

function stubCanvas() {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => fakeContext,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    configurable: true,
    value: (callback: (blob: Blob | null) => void, type: string) => {
      callback(new Blob(['image'], { type }));
    },
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => undefined,
  });
}

function startedInspection() {
  return buildWorkspaceInspection({
    status: 'in_progress',
    started_at: '2026-11-24T07:20:00.000Z',
    form_version_id: 'wv1',
    consent_version_id: 'cv1',
  });
}

function photoInput() {
  // eslint-disable-next-line testing-library/no-node-access -- the file input is hidden behind its button
  const input = document.querySelector<HTMLInputElement>('input[type="file"][accept="image/*"]');
  if (!input) {
    throw new Error('The photo input is missing');
  }
  return input;
}

describe('InspectionWorkspacePage', { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    for (const name of prototypeOverrides) {
      Reflect.deleteProperty(HTMLCanvasElement.prototype, name);
    }
  });

  it('starts on the consent and keeps the sections locked until it is signed', async () => {
    const inspection = buildWorkspaceInspection();
    server.use(...workspaceHandlers({ inspection }));
    await renderAppRoute(`/field/inspections/${inspection.id}`, { auth: signedInAs('inspector') });

    expect(await screen.findByRole('heading', { name: ro.consent.title })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: firstSection?.check_ro })).not.toBeChecked();
    expect(screen.getByRole('button', { name: ro.consent.sign })).toBeDisabled();
    const nav = screen.getByRole('navigation', { name: ro.nav.label });
    expect(
      within(nav).queryByRole('link', { name: new RegExp(firstCategory?.name_ro ?? '', 'u') }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: ro.aside.submit })).toBeDisabled();
  });

  it('uploads the signature and starts the inspection with the accepted sections', async () => {
    stubCanvas();
    const inspection = buildWorkspaceInspection();
    const uploads: string[] = [];
    let started: unknown = null;
    server.use(
      http.post(supabaseUrl('/storage/v1/object/inspection-media/*'), ({ request }) => {
        uploads.push(new URL(request.url).pathname);
        return HttpResponse.json({ Key: 'inspection-media/signature.png' });
      }),
      http.post(supabaseUrl('/rest/v1/rpc/start_inspection'), async ({ request }) => {
        started = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
      ...workspaceHandlers({ inspection, progress: PROGRESS }),
    );
    await renderAppRoute(`/field/inspections/${inspection.id}`, { auth: signedInAs('inspector') });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('checkbox', { name: firstSection?.check_ro }));
    const pad = screen.getByRole('img', { name: ro.consent.signatureArea });
    await user.pointer([
      { keys: '[MouseLeft>]', target: pad, coords: { clientX: 10, clientY: 10 } },
      { target: pad, coords: { clientX: 60, clientY: 40 } },
      { keys: '[/MouseLeft]', target: pad },
    ]);
    const sign = screen.getByRole('button', { name: ro.consent.sign });
    await waitFor(() => {
      expect(sign).toBeEnabled();
    });
    await user.click(sign);

    await waitFor(() => {
      expect(started).toMatchObject({
        p_inspection_id: inspection.id,
        p_signer_name: inspection.access_name,
        p_language: 'ro',
        p_accepted_section_ids: [firstSection?.id],
      });
    });
    expect(uploads).toHaveLength(1);
    expect(uploads[0]).toContain(`/inspection-media/${inspection.id}/signature/`);
    expect(uploads[0]).toBe(
      `/storage/v1/object/inspection-media/${String(Reflect.get(Object(started), 'p_signature_path'))}`,
    );
  });

  it('shows the questions, the saved answers and the server score once started', async () => {
    const inspection = startedInspection();
    server.use(
      ...workspaceHandlers({
        inspection,
        answers: [{ question_id: 'wq1', answer: 'good', note: '' }],
        consent: CONSENT,
        progress: {
          answered: 1,
          total: 2,
          photos: 0,
          videos: 0,
          missing_media: 1,
          score: 10,
          categories: [
            { category_id: 'wc1', answered: 1, total: 1, score: 10 },
            { category_id: 'wc2', answered: 0, total: 1, score: null },
          ],
        },
      }),
    );
    await renderAppRoute(`/field/inspections/${inspection.id}?section=struct`, {
      auth: signedInAs('inspector'),
    });

    const question = await screen.findByRole('article', { name: firstQuestion?.text_ro });
    expect(within(question).getByRole('radio', { name: ro.question.answers.good })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(within(question).getByText(ro.question.missingPhoto)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('progressbar', { name: ro.aside.progress })).toHaveAttribute(
        'aria-valuenow',
        '1',
      );
    });
    const nav = screen.getByRole('navigation', { name: ro.nav.label });
    expect(
      within(nav).getByRole('link', { name: new RegExp(secondCategory?.name_ro ?? '', 'u') }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ro.aside.submit })).toBeDisabled();
  });

  it('saves the note when the field loses focus', async () => {
    const inspection = startedInspection();
    const saved: unknown[] = [];
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/save_inspection_answer'), async ({ request }) => {
        saved.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
      ...workspaceHandlers({
        inspection,
        answers: [{ question_id: 'wq1', answer: 'good', note: '' }],
        consent: CONSENT,
        progress: PROGRESS,
      }),
    );
    await renderAppRoute(`/field/inspections/${inspection.id}?section=struct`, {
      auth: signedInAs('inspector'),
    });
    const user = userEvent.setup();

    const question = await screen.findByRole('article', { name: firstQuestion?.text_ro });
    await user.click(within(question).getByRole('button', { name: ro.question.addNote }));
    await user.type(
      within(question).getByRole('textbox', { name: ro.question.noteLabel }),
      'Fisură la colț',
    );
    await user.tab();

    await waitFor(() => {
      expect(saved).toContainEqual(
        expect.objectContaining({ p_question_id: 'wq1', p_note: 'Fisură la colț' }),
      );
    });
  });

  it('uploads a photo with its thumbnail and registers it', async () => {
    vi.stubGlobal('createImageBitmap', () =>
      Promise.resolve({ width: 4000, height: 3000, close: () => undefined }),
    );
    stubCanvas();
    const inspection = startedInspection();
    const uploads: string[] = [];
    let registered: unknown = null;
    server.use(
      http.post(supabaseUrl('/storage/v1/object/inspection-media/*'), ({ request }) => {
        uploads.push(new URL(request.url).pathname);
        return HttpResponse.json({ Key: 'inspection-media/photo.webp' });
      }),
      http.post(supabaseUrl('/rest/v1/rpc/add_inspection_media'), async ({ request }) => {
        registered = await request.json();
        return HttpResponse.json('m2');
      }),
      ...workspaceHandlers({
        inspection,
        answers: [{ question_id: 'wq1', answer: 'good', note: '' }],
        consent: CONSENT,
        progress: PROGRESS,
      }),
    );
    await renderAppRoute(`/field/inspections/${inspection.id}?section=struct`, {
      auth: signedInAs('inspector'),
    });
    const user = userEvent.setup();

    await screen.findByRole('article', { name: firstQuestion?.text_ro });
    await user.upload(photoInput(), new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }));

    await waitFor(() => {
      expect(registered).not.toBeNull();
    });
    const folder = `/inspection-media/${inspection.id}/question/`;
    expect(uploads).toHaveLength(2);
    const [main, thumb] = uploads;
    expect(main).toMatch(new RegExp(`${folder}[^/]+\\.webp$`, 'u'));
    expect(thumb).toBe(main?.replace(/\.webp$/u, '-thumb.webp'));
    expect(registered).toMatchObject({
      p_inspection_id: inspection.id,
      p_question_id: 'wq1',
      p_kind: 'photo',
      p_mime_type: 'image/webp',
      p_path: main?.split('/inspection-media/')[1],
    });
  });

  it('shows the photo thumbnail and removes the photo with its thumbnail', async () => {
    const inspection = startedInspection();
    let removed: unknown = null;
    let deleted: unknown = null;
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/remove_inspection_media'), async ({ request }) => {
        removed = await request.json();
        return HttpResponse.json(PHOTO.path);
      }),
      http.delete(supabaseUrl('/storage/v1/object/inspection-media'), async ({ request }) => {
        deleted = await request.json();
        return HttpResponse.json([]);
      }),
      ...workspaceHandlers({
        inspection,
        answers: [{ question_id: 'wq1', answer: 'good', note: '' }],
        media: [PHOTO],
        consent: CONSENT,
        progress: PROGRESS,
      }),
    );
    await renderAppRoute(`/field/inspections/${inspection.id}?section=struct`, {
      auth: signedInAs('inspector'),
    });
    const user = userEvent.setup();

    const photoLabel = ro.question.mediaAlt.replace('{{index}}', '1').replace('{{number}}', '01');
    await waitFor(() => {
      expect(screen.getByRole('img', { name: photoLabel })).toHaveAttribute(
        'src',
        expect.stringContaining('photo-1-thumb.webp'),
      );
    });

    await user.click(
      screen.getByRole('button', {
        name: ro.question.removePhoto.replace('{{index}}', '1').replace('{{number}}', '01'),
      }),
    );

    await waitFor(() => {
      expect(deleted).toEqual({
        prefixes: [PHOTO.path, PHOTO.path.replace(/\.webp$/u, '-thumb.webp')],
      });
    });
    expect(removed).toEqual({ p_media_id: PHOTO.id });
  });

  it('falls back to the full photo when it has no thumbnail', async () => {
    const inspection = startedInspection();
    server.use(
      http.post(supabaseUrl('/storage/v1/object/sign/inspection-media'), () =>
        HttpResponse.json([
          {
            path: PHOTO.path,
            signedURL: `/object/sign/inspection-media/${PHOTO.path}?token=t`,
            error: null,
          },
          {
            path: PHOTO.path.replace(/\.webp$/u, '-thumb.webp'),
            signedURL: null,
            error: 'Either the object does not exist or you do not have access to it',
          },
        ]),
      ),
      ...workspaceHandlers({
        inspection,
        answers: [{ question_id: 'wq1', answer: 'good', note: '' }],
        media: [PHOTO],
        consent: CONSENT,
        progress: PROGRESS,
      }),
    );
    await renderAppRoute(`/field/inspections/${inspection.id}?section=struct`, {
      auth: signedInAs('inspector'),
    });

    const photoLabel = ro.question.mediaAlt.replace('{{index}}', '1').replace('{{number}}', '01');
    await waitFor(() => {
      expect(screen.getByRole('img', { name: photoLabel })).toHaveAttribute(
        'src',
        expect.stringContaining('photo-1.webp?token'),
      );
    });
  });

  it('saves an answer and sends the inspection after the owner confirms', async () => {
    const inspection = startedInspection();
    const saved: unknown[] = [];
    let sent: unknown = null;
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/save_inspection_answer'), async ({ request }) => {
        saved.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(supabaseUrl('/rest/v1/rpc/submit_inspection'), async ({ request }) => {
        sent = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
      ...workspaceHandlers({
        inspection,
        answers: [{ question_id: 'wq1', answer: 'good', note: '' }],
        consent: CONSENT,
        progress: PROGRESS,
      }),
    );
    await renderAppRoute(`/field/inspections/${inspection.id}?section=struct`, {
      auth: signedInAs('inspector'),
    });
    const user = userEvent.setup();

    const question = await screen.findByRole('article', { name: firstQuestion?.text_ro });
    await user.click(within(question).getByRole('radio', { name: ro.question.answers.problem }));
    await waitFor(() => {
      expect(saved).toContainEqual(
        expect.objectContaining({ p_question_id: 'wq1', p_answer: 'problem' }),
      );
    });

    await user.click(await screen.findByRole('button', { name: ro.aside.submit }));
    await user.click(await screen.findByRole('button', { name: ro.confirm.confirm }));
    await waitFor(() => {
      expect(sent).toMatchObject({ p_owner_name: 'D. Popescu' });
    });
  });

  describe('owner confirmation', () => {
    async function openConfirmation(submitHandler?: Parameters<typeof server.use>[0]) {
      const inspection = startedInspection();
      server.use(
        ...(submitHandler ? [submitHandler] : []),
        ...workspaceHandlers({
          inspection,
          answers: [{ question_id: 'wq1', answer: 'good', note: '' }],
          consent: CONSENT,
          progress: PROGRESS,
        }),
      );
      await renderAppRoute(`/field/inspections/${inspection.id}?section=struct`, {
        auth: signedInAs('inspector'),
      });
      const user = userEvent.setup();
      await user.click(await screen.findByRole('button', { name: ro.aside.submit }));
      return user;
    }

    it('asks for the owner name before sending', async () => {
      const user = await openConfirmation();

      const name = await screen.findByRole('textbox', { name: ro.confirm.ownerName });
      await user.clear(name);
      await user.click(screen.getByRole('button', { name: ro.confirm.confirm }));

      expect(await screen.findByText(roCommon.validation.required)).toBeInTheDocument();
    });

    it('shows the server refusal of the owner name on the field', async () => {
      const user = await openConfirmation(
        http.post(supabaseUrl('/rest/v1/rpc/submit_inspection'), () =>
          postgrestErrorResponse('P0001', 'owner_name_required', 400),
        ),
      );

      await user.click(await screen.findByRole('button', { name: ro.confirm.confirm }));

      const name = await screen.findByRole('textbox', { name: ro.confirm.ownerName });
      await waitFor(() => {
        expect(name).toHaveAttribute('aria-invalid', 'true');
      });
      expect(
        screen.queryByText(roCommon.errors.reasons.inspection_incomplete),
      ).not.toBeInTheDocument();
      expect(screen.getByText(roCommon.errors.reasons.owner_name_required)).toBeInTheDocument();
    });

    it('shows any other refusal in the dialog', async () => {
      const user = await openConfirmation(
        http.post(supabaseUrl('/rest/v1/rpc/submit_inspection'), () =>
          postgrestErrorResponse('P0001', 'inspection_incomplete', 400),
        ),
      );

      await user.click(await screen.findByRole('button', { name: ro.confirm.confirm }));

      const dialog = await screen.findByRole('alertdialog');
      expect(
        await within(dialog).findByText(roCommon.errors.reasons.inspection_incomplete),
      ).toBeInTheDocument();
    });

    it('disables the confirmation while sending', async () => {
      const user = await openConfirmation(
        http.post(supabaseUrl('/rest/v1/rpc/submit_inspection'), async () => {
          await delay('infinite');
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await user.click(await screen.findByRole('button', { name: ro.confirm.confirm }));

      expect(await screen.findByRole('button', { name: ro.confirm.confirming })).toBeDisabled();
    });
  });

  it('shows the route error when the workspace cannot load', async () => {
    const inspection = buildWorkspaceInspection();
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/inspector_workspace'), () =>
        postgrestErrorResponse('XX000', 'boom', 500),
      ),
    );
    await renderAppRoute(`/field/inspections/${inspection.id}`, { auth: signedInAs('inspector') });

    expect(await screen.findByText(roCommon.pages.error.title)).toBeInTheDocument();
  });
});
