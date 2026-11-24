import { screen } from '@testing-library/react';
import ro from '@/i18n/locales/ro/inspectionForm.json';
import { signedInAs } from '@/test/factories/auth';
import { formVersionsResponse, publishedFormVersion } from '@/test/msw/handlers/inspection-form';
import { server } from '@/test/msw/server';
import { renderAppRoute } from '@/test/render';

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
});
