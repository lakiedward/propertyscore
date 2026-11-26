import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import ro from '@/i18n/locales/ro/inspectionForm.json';
import { signedInAs } from '@/test/factories/auth';
import {
  archivedFormVersion,
  formCategories,
  formCategoriesResponse,
  formVersionUsageResponse,
  formVersionsResponse,
  publishedFormVersion,
} from '@/test/msw/handlers/inspection-form';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

const DRAFT = { ...publishedFormVersion, status: 'draft', version: 4 };

describe('ContentPage', { timeout: 20_000 }, () => {
  it('shows the published form read-only with its weights and questions', async () => {
    await renderAppRoute('/admin/content?tab=form', { auth: signedInAs('admin') });

    expect(
      await screen.findByText(ro.form.titlePublished.replace('{{version}}', '3')),
    ).toBeInTheDocument();
    expect(screen.getByText(ro.form.readOnly.title)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Pondere Structură' })).toBeDisabled();
    expect(screen.getByDisplayValue('Fisuri vizibile în pereți portanți?')).toBeInTheDocument();
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

    expect(await screen.findByDisplayValue('Prelucrarea datelor personale')).toBeInTheDocument();
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
});
