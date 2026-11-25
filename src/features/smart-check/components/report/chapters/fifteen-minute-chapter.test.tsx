import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import { buildSavedWalkReport, SAVED_WALK_POLYLINE } from '@/test/factories/smart-check-report';
import { SEEDED_REPORT } from '@/test/msw/handlers/smart-check';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const copy = ro.report.chapters.fifteenMinute;

describe('FifteenMinuteChapter', { timeout: 20_000 }, () => {
  it('shows the checklist, the comparison with a typical neighbourhood and the score', async () => {
    const { user } = await renderAppRoute(
      `/check/result/${SEEDED_REPORT.id}?chapter=fifteenMinute`,
      { auth: signedInAs() },
    );

    const checklistTitle = await screen.findByRole('heading', {
      level: 3,
      name: /12 din 30 la 15 minute pe jos/,
    });
    expect(checklistTitle).toBeInTheDocument();
    expect(screen.getByText(copy.precision.routed)).toBeInTheDocument();
    expect(
      screen.getByText(copy.map.method.routedWithSpeed.replace('{{speed}}', '75'), {
        exact: false,
      }),
    ).toBeInTheDocument();
    const supermarket = screen.getByRole('button', { name: /Supermarket/ });
    expect(supermarket).toHaveAttribute('aria-pressed', 'false');
    await user.click(supermarket);
    expect(supermarket).toHaveAttribute('aria-pressed', 'true');

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: ro.report.chapters.fifteenMinute.tiles.title,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('cartier obișnuit: 6')).toBeInTheDocument();
    expect(screen.getByText(/Tu · 42/)).toBeInTheDocument();
  });

  it('keeps saved straight-line times labeled as estimates after a route is drawn', async () => {
    const report = buildSavedWalkReport('straight_line');
    server.use(
      http.get(supabaseUrl('/rest/v1/online_reports'), () => HttpResponse.json([report])),
      http.post(supabaseUrl('/rest/v1/rpc/request_saved_report_walk_route'), () =>
        HttpResponse.json({ status: 'ready', polyline6: SAVED_WALK_POLYLINE }),
      ),
    );
    const { user } = await renderAppRoute(`/check/result/${report.id}?chapter=fifteenMinute`, {
      auth: signedInAs(),
    });

    expect(await screen.findByText(copy.precision.estimated)).toBeInTheDocument();
    const shop = screen.getByRole('button', { name: /Supermarket/ });
    await user.click(shop);
    expect(await screen.findByRole('img', { name: 'fifteen-route' })).toBeInTheDocument();
    expect(screen.getByText(copy.map.routeStatus.ready)).toBeInTheDocument();
    expect(shop).toHaveTextContent(/7 min/);
    expect(
      screen.getByText(`${copy.map.sourceNoDate} ${copy.map.method.estimated}`),
    ).toBeInTheDocument();
    expect(screen.queryByText(copy.precision.routed)).not.toBeInTheDocument();
  });

  it('does not claim street routing in the summary explorer for a straight-line report', async () => {
    const report = buildSavedWalkReport('straight_line');
    server.use(http.get(supabaseUrl('/rest/v1/online_reports'), () => HttpResponse.json([report])));
    const { user } = await renderAppRoute(`/check/result/${report.id}`, { auth: signedInAs() });
    const summary = ro.report.chapters.summary;
    await user.click(await screen.findByRole('button', { name: summary.mapBand.open }));

    expect(screen.getByText(summary.explorer.walkNote.estimated)).toBeInTheDocument();
    expect(screen.queryByText(summary.explorer.walkNote.routed)).not.toBeInTheDocument();
  });
});
