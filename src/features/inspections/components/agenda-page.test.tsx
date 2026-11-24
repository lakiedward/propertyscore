import { screen, within } from '@testing-library/react';
import ro from '@/i18n/locales/ro/inspections.json';
import { buildAgendaInspection } from '@/test/factories/agenda-inspection';
import { signedInAs } from '@/test/factories/auth';
import { agendaResponse } from '@/test/msw/handlers/inspections';
import { server } from '@/test/msw/server';
import { renderAppRoute } from '@/test/render';

const NOW = new Date(2026, 10, 24, 8, 0);

function at(day: number, hour: number, minute = 0) {
  return new Date(2026, 10, day, hour, minute).toISOString();
}

describe('AgendaPage', { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows today's inspections and the next one in the hero", async () => {
    const next = buildAgendaInspection({
      address_text: 'Str. Școlii 12',
      starts_at: at(24, 9, 30),
      ends_at: at(24, 11, 30),
    });
    server.use(agendaResponse([next]));
    await renderAppRoute('/field', { auth: signedInAs('user', 'inspector') });

    const card = await screen.findByRole('article', { name: 'Str. Școlii 12' });
    expect(within(card).getByText(ro.agenda.status.inspector_assigned)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: ro.agenda.navigate })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps/dir'),
    );
    expect(
      within(card).getByRole('button', { name: new RegExp(`^${ro.agenda.start}`, 'u') }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: new RegExp(`^${ro.agenda.next.start}`, 'u') }),
    ).toBeDisabled();
  });

  it('opens the inspection once its start window begins and continues one in progress', async () => {
    vi.setSystemTime(new Date(2026, 10, 24, 9, 0));
    const startable = buildAgendaInspection({
      address_text: 'Str. Școlii 12',
      starts_at: at(24, 9, 30),
      ends_at: at(24, 11, 30),
    });
    const started = buildAgendaInspection({
      address_text: 'Calea Aradului 52',
      status: 'in_progress',
      starts_at: at(24, 13, 0),
      ends_at: at(24, 15, 0),
      answered_count: 12,
      question_count: 44,
    });
    server.use(agendaResponse([startable, started]));
    await renderAppRoute('/field', { auth: signedInAs('inspector') });

    const card = await screen.findByRole('article', { name: 'Str. Școlii 12' });
    expect(within(card).getByRole('link', { name: ro.agenda.start })).toHaveAttribute(
      'href',
      `/field/inspections/${startable.id}`,
    );
    const inProgress = screen.getByRole('article', { name: 'Calea Aradului 52' });
    expect(
      within(inProgress).getByText(
        ro.agenda.inProgress.replace('{{answered}}', '12').replace('{{total}}', '44'),
      ),
    ).toBeInTheDocument();
    expect(within(inProgress).getByRole('link', { name: ro.agenda.continue })).toBeInTheDocument();
  });

  it('points to the next inspection when the chosen day is empty', async () => {
    server.use(
      agendaResponse([
        buildAgendaInspection({
          address_text: 'Calea Aradului 52',
          starts_at: at(26, 9),
          ends_at: at(26, 11),
        }),
      ]),
    );
    await renderAppRoute('/field?day=tomorrow', { auth: signedInAs('user', 'inspector') });

    expect(await screen.findByText(ro.agenda.empty.day)).toBeInTheDocument();
    expect(screen.getByText(/Calea Aradului 52\.$/)).toBeInTheDocument();
  });

  it('switches to the week from the day control', async () => {
    server.use(
      agendaResponse([
        buildAgendaInspection({
          address_text: 'Calea Aradului 52',
          starts_at: at(27, 9),
          ends_at: at(27, 11),
        }),
      ]),
    );
    const { user } = await renderAppRoute('/field', { auth: signedInAs('user', 'inspector') });

    await user.click(await screen.findByRole('radio', { name: ro.agenda.days.week }));

    expect(await screen.findByRole('article', { name: 'Calea Aradului 52' })).toBeInTheDocument();
  });

  it('says so when no inspection is assigned', async () => {
    await renderAppRoute('/field', { auth: signedInAs('user', 'inspector') });

    expect(await screen.findByText(ro.agenda.next.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(ro.agenda.empty.day)).toBeInTheDocument();
  });
});
