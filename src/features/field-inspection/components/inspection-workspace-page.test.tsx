import { screen, waitFor, within } from '@testing-library/react';
import ro from '@/i18n/locales/ro/fieldInspection.json';
import { signedInAs } from '@/test/factories/auth';
import { buildWorkspaceInspection } from '@/test/factories/field-inspection';
import { workspaceHandlers } from '@/test/msw/handlers/field-inspection';
import { server } from '@/test/msw/server';
import { renderAppRoute } from '@/test/render';

const NOW = new Date('2026-11-24T07:00:00.000Z');

describe('InspectionWorkspacePage', { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts on the consent and keeps the sections locked until it is signed', async () => {
    const inspection = buildWorkspaceInspection();
    server.use(...workspaceHandlers({ inspection }));
    await renderAppRoute(`/field/inspections/${inspection.id}`, { auth: signedInAs('inspector') });

    expect(await screen.findByRole('heading', { name: ro.consent.title })).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Sunt de acord cu prelucrarea datelor.' }),
    ).not.toBeChecked();
    expect(screen.getByRole('button', { name: ro.consent.sign })).toBeDisabled();
    const nav = screen.getByRole('navigation', { name: ro.nav.label });
    expect(within(nav).queryByRole('link', { name: /Structură/u })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: ro.aside.submit })).toBeDisabled();
  });

  it('shows the questions, the saved answers and the server score once started', async () => {
    const inspection = buildWorkspaceInspection({
      status: 'in_progress',
      started_at: '2026-11-24T07:20:00.000Z',
      form_version_id: 'wv1',
      consent_version_id: 'cv1',
    });
    server.use(
      ...workspaceHandlers({
        inspection,
        answers: [{ question_id: 'wq1', answer: 'good', note: '' }],
        consent: {
          language: 'ro',
          signer_name: 'D. Popescu',
          signed_at: '2026-11-24T07:20:00.000Z',
        },
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

    const question = await screen.findByRole('article', {
      name: 'Fisuri vizibile în pereți portanți?',
    });
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
    expect(within(nav).getByRole('link', { name: /Umezeală/u })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ro.aside.submit })).toBeDisabled();
  });
});
