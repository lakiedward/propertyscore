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
    expect(within(card).getByRole('button', { name: ro.agenda.start })).toBeDisabled();
    expect(screen.getByRole('button', { name: ro.agenda.next.start })).toBeDisabled();
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
