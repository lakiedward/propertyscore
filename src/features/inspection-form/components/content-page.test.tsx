import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/inspectionForm.json';
import { signedInAs } from '@/test/factories/auth';
import { buildConsentSection, buildFormQuestion } from '@/test/factories/inspection-form';
import {
  archivedFormVersion,
  formCategories,
  formCategoriesResponse,
  formVersionUsageResponse,
  formVersionsResponse,
  publishedFormVersion,
} from '@/test/msw/handlers/inspection-form';
import { postgrestErrorResponse } from '@/test/msw/postgrest-error';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

const DRAFT = { ...publishedFormVersion, status: 'draft', version: 4 };

const CONSENT_DRAFT = {
  id: 'cv2',
  version: 1.1,
  status: 'draft',
  published_at: null,
  archived_at: null,
  updated_at: '2026-11-20T09:00:00+03:00',
};

const firstQuestion = buildFormQuestion();
const consentSection = buildConsentSection();

describe('ContentPage', { timeout: 20_000 }, () => {
  it('shows the published form read-only with its weights and questions', async () => {
    await renderAppRoute('/admin/content?tab=form', { auth: signedInAs('admin') });

    expect(
      await screen.findByText(ro.form.titlePublished.replace('{{version}}', '3')),
    ).toBeInTheDocument();
    expect(screen.getByText(ro.form.readOnly.title)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Pondere Structură' })).toBeDisabled();
    expect(screen.getByDisplayValue(firstQuestion.text_ro)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ro.form.createDraft })).toBeEnabled();
  });

  it('opens a draft for editing and flags a question without English text', async () => {
    server.use(formVersionsResponse([{ ...publishedFormVersion, status: 'draft', version: 4 }]));
    await renderAppRoute('/admin/content?tab=form&category=umez', { auth: signedInAs('admin') });

    expect(
      await screen.findByText(ro.form.titleDraft.replace('{{version}}', '4')),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ro.form.publish })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Pondere Umezeală' })).toBeEnabled();
    expect(screen.getByText(ro.form.question.missingEn)).toBeInTheDocument();
  });

  it('shows the published consent sections', async () => {
    await renderAppRoute('/admin/content?tab=consent', { auth: signedInAs('admin') });

    expect(await screen.findByDisplayValue(consentSection.title_ro)).toBeInTheDocument();
    expect(screen.getByText(ro.consent.notice.title)).toBeInTheDocument();
  });

  it('keeps publishing disabled until the weights total 100', async () => {
    server.use(
      formVersionsResponse([DRAFT]),
      formCategoriesResponse(
        formCategories.map((category, index) => ({ ...category, weight: index === 0 ? 60 : 30 })),
      ),
    );
    await renderAppRoute('/admin/content?tab=form', { auth: signedInAs('admin') });

    expect(await screen.findByText(ro.form.weightsInvalid.title)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ro.form.publish })).toBeDisabled();
  });

  it('saves a question text when its field loses focus', async () => {
    let body: unknown = null;
    server.use(
      formVersionsResponse([DRAFT]),
      http.patch(supabaseUrl('/rest/v1/inspection_form_questions'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json([{ id: 'q2' }]);
      }),
    );
    await renderAppRoute('/admin/content?tab=form&category=umez', { auth: signedInAs('admin') });
    const user = userEvent.setup();

    const english = await screen.findByRole('textbox', { name: ro.form.question.textEn });
    await user.type(english, 'Stains or mould?');
    await user.tab();

    await waitFor(() => {
      expect(body).toEqual({ text_en: 'Stains or mould?' });
    });
  });

  it('adds a category through the dialog', async () => {
    let body: unknown = null;
    server.use(
      formVersionsResponse([DRAFT]),
      http.post(supabaseUrl('/rest/v1/rpc/add_inspection_form_category'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json('c3');
      }),
    );
    await renderAppRoute('/admin/content?tab=form', { auth: signedInAs('admin') });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: ro.form.categories.add }));
    await user.type(
      screen.getByRole('textbox', { name: ro.form.category.dialog.nameRo }),
      'Exterior',
    );
    await user.type(
      screen.getByRole('textbox', { name: ro.form.category.dialog.nameEn }),
      'Exterior',
    );
    await user.click(screen.getByRole('button', { name: ro.form.category.dialog.add }));

    await waitFor(() => {
      expect(body).toMatchObject({ p_name_ro: 'Exterior', p_name_en: 'Exterior' });
    });
  });

  it('opens an archived form version read-only and restores it as a new draft', async () => {
    let body: unknown = null;
    server.use(
      formVersionsResponse([publishedFormVersion, archivedFormVersion]),
      http.post(
        supabaseUrl('/rest/v1/rpc/restore_inspection_form_version'),
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json('f1000000-0000-4000-8000-000000000009');
        },
      ),
    );
    await renderAppRoute('/admin/content?tab=form', { auth: signedInAs('admin') });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /^v2/ }));

    expect(
      await screen.findByText(ro.versions.banner.title.replace('{{version}}', 'v2')),
    ).toBeInTheDocument();
    expect(screen.getByText(ro.versions.banner.unused)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Pondere Structură' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: ro.versions.restore }));
    await user.click(
      await screen.findByRole('button', {
        name: ro.versions.restoreConfirm.replace('{{next}}', 'v4'),
      }),
    );

    await waitFor(() => {
      expect(body).toEqual({ p_form_version_id: archivedFormVersion.id });
    });
  });

  it('deletes an archived form version no inspection used', async () => {
    let body: unknown = null;
    server.use(
      formVersionsResponse([publishedFormVersion, archivedFormVersion]),
      http.post(supabaseUrl('/rest/v1/rpc/delete_inspection_form_version'), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderAppRoute('/admin/content?tab=form', { auth: signedInAs('admin') });
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', {
        name: ro.versions.actions.replace('{{version}}', 'v2'),
      }),
    );
    await user.click(await screen.findByRole('menuitem', { name: ro.versions.delete }));
    await user.click(await screen.findByRole('button', { name: ro.versions.deleteConfirm }));

    await waitFor(() => {
      expect(body).toEqual({ p_form_version_id: archivedFormVersion.id });
    });
  });

  it('keeps a form version an inspection used from being deleted', async () => {
    server.use(
      formVersionsResponse([publishedFormVersion, archivedFormVersion]),
      formVersionUsageResponse([{ form_version_id: archivedFormVersion.id, inspection_count: 3 }]),
    );
    await renderAppRoute('/admin/content?tab=form', { auth: signedInAs('admin') });
    const user = userEvent.setup();

    expect(
      await screen.findByText(ro.versions.usedIn_few.replace('{{count}}', '3')),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: ro.versions.actions.replace('{{version}}', 'v2') }),
    );
    expect(
      await screen.findByRole('menuitem', { name: new RegExp(ro.versions.delete) }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(ro.versions.cannotDeleteInUse)).toBeInTheDocument();
  });

  it('saves the changed consent sections and publishes the draft', async () => {
    let saved: unknown = null;
    let published: unknown = null;
    server.use(
      http.get(supabaseUrl('/rest/v1/consent_versions'), () => HttpResponse.json([CONSENT_DRAFT])),
      http.post(supabaseUrl('/rest/v1/rpc/save_consent_sections'), async ({ request }) => {
        saved = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(supabaseUrl('/rest/v1/rpc/publish_consent_version'), async ({ request }) => {
        published = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderAppRoute('/admin/content?tab=consent', { auth: signedInAs('admin') });
    const user = userEvent.setup();

    const title = await screen.findByRole('textbox', { name: ro.consent.fields.title });
    await user.clear(title);
    await user.type(title, 'Date personale');
    await user.click(screen.getByRole('button', { name: ro.consent.save }));

    await waitFor(() => {
      expect(saved).toEqual({
        p_consent_version_id: CONSENT_DRAFT.id,
        p_sections: [
          expect.objectContaining({
            id: consentSection.id,
            title_ro: 'Date personale',
            check_ro: consentSection.check_ro,
          }),
        ],
      });
    });

    await user.click(screen.getByRole('button', { name: ro.consent.publish }));
    await waitFor(() => {
      expect(published).toEqual({ p_consent_version_id: CONSENT_DRAFT.id });
    });
  });

  it('saves a category weight when its field loses focus', async () => {
    let body: unknown = null;
    server.use(
      formVersionsResponse([DRAFT]),
      http.patch(supabaseUrl('/rest/v1/inspection_form_categories'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json([{ id: 'c1' }]);
      }),
    );
    await renderAppRoute('/admin/content?tab=form', { auth: signedInAs('admin') });
    const user = userEvent.setup();

    const weight = await screen.findByRole('textbox', { name: 'Pondere Structură' });
    await user.clear(weight);
    await user.type(weight, '7a0');
    await user.tab();

    await waitFor(() => {
      expect(body).toEqual({ weight: 70 });
    });
  });

  it('refuses answer points out of order without saving them', async () => {
    let isSaved = false;
    server.use(
      formVersionsResponse([DRAFT]),
      http.patch(supabaseUrl('/rest/v1/inspection_form_versions'), () => {
        isSaved = true;
        return HttpResponse.json([{ id: DRAFT.id }]);
      }),
    );
    await renderAppRoute('/admin/content?tab=form', { auth: signedInAs('admin') });
    const user = userEvent.setup();

    const good = await screen.findByRole('textbox', { name: ro.form.points.good });
    await user.clear(good);
    await user.type(good, '5');
    await user.tab();

    expect(await screen.findByText(roCommon.validation.invalid)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: ro.form.points.acceptable })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(isSaved).toBe(false);
  });

  it('asks for the Romanian name when a category is added empty', async () => {
    let isAdded = false;
    server.use(
      formVersionsResponse([DRAFT]),
      http.post(supabaseUrl('/rest/v1/rpc/add_inspection_form_category'), () => {
        isAdded = true;
        return HttpResponse.json('c3');
      }),
    );
    await renderAppRoute('/admin/content?tab=form', { auth: signedInAs('admin') });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: ro.form.categories.add }));
    await user.click(screen.getByRole('button', { name: ro.form.category.dialog.add }));

    expect(await screen.findByText(roCommon.validation.required)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: ro.form.category.dialog.nameRo })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(isAdded).toBe(false);
  });

  it('shows the route error when the versions cannot load', async () => {
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/inspection_form_version_usage'), () =>
        postgrestErrorResponse('XX000', 'boom', 500),
      ),
    );
    await renderAppRoute('/admin/content?tab=form', { auth: signedInAs('admin') });

    expect(await screen.findByText(roCommon.pages.error.title)).toBeInTheDocument();
  });
});
