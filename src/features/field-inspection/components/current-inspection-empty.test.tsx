import { screen } from '@testing-library/react';
import ro from '@/i18n/locales/ro/fieldInspection.json';
import { buildAgendaInspection } from '@/test/factories/agenda-inspection';
import { signedInAs } from '@/test/factories/auth';
import { buildWorkspaceInspection } from '@/test/factories/field-inspection';
import { workspaceHandlers } from '@/test/msw/handlers/field-inspection';
import { agendaResponse } from '@/test/msw/handlers/inspections';
import { server } from '@/test/msw/server';
import { renderAppRoute } from '@/test/render';

const NOW = new Date('2026-11-24T07:00:00.000Z');

describe('CurrentInspectionEmpty', { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the inspection in progress', async () => {
    const inspection = buildWorkspaceInspection({ status: 'in_progress' });
    server.use(
      agendaResponse([buildAgendaInspection({ id: inspection.id, status: 'in_progress' })]),
      ...workspaceHandlers({ inspection }),
    );
    const { router } = await renderAppRoute('/field/current', { auth: signedInAs('inspector') });

    expect(await screen.findByRole('heading', { name: ro.consent.title })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/field/inspections/${inspection.id}`);
  });

  it('shows the empty state when there is no inspection today', async () => {
    server.use(agendaResponse([]));
    await renderAppRoute('/field/current', { auth: signedInAs('inspector') });

    expect(await screen.findByText(ro.current.emptyTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: ro.current.toAgenda })).toBeInTheDocument();
  });
});
