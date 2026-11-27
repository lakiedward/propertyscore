import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import {
  buildReportRow,
  buildSavedWalkReport,
  FREIDORF_REPORT_RESULT,
  SAVED_WALK_POLYLINE,
} from '@/test/factories/smart-check-report';
import { SEEDED_REPORT } from '@/test/msw/handlers/smart-check';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute, renderWithProviders } from '@/test/render';
import { WALK_LIMIT_MIN } from '../../../fifteen-minute.utils';
import { parseReportResult } from '../../../report.utils';
import { FifteenMinuteChapter } from './fifteen-minute-chapter';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const copy = ro.report.chapters.fifteenMinute;
const zoneLabel = copy.map.key.zone.replace('{{limit}}', String(WALK_LIMIT_MIN));

describe('FifteenMinuteChapter', { timeout: 20_000 }, () => {
  it.each([
    ['ro', 'detaliile școlilor au fost copiate la 27 noiembrie 2026 pentru tranziție'],
    ['en', 'school details were copied on 27 November 2026 for the transition'],
  ] as const)('labels the school details copy date in %s', async (locale, copy) => {
    const result = parseReportResult(FREIDORF_REPORT_RESULT);
    if (!result?.sections.education) throw new Error('Education fixture is required');
    result.sections.education.legacy_observed_at = '2026-11-27T23:30:00Z';
    result.snapshot.source_dates.siiir = '2025-02-14';
    const report = { ...buildReportRow(), status: 'ready' as const, result };

    await renderWithProviders(<FifteenMinuteChapter report={report} onOpenChapter={vi.fn()} />, {
      locale,
    });

    expect(await screen.findByText(copy, { exact: false })).toBeVisible();
    expect(screen.queryByText('2025', { exact: false })).not.toBeInTheDocument();
  });

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
    const legend = within(screen.getByRole('group', { name: copy.map.key.title }));
    expect(legend.getByText(zoneLabel)).toBeInTheDocument();
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

  it('omits the legend entry without a contour and keeps the estimate after drawing a route', async () => {
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
    const legend = within(screen.getByRole('group', { name: copy.map.key.title }));
    expect(legend.getByText(copy.map.key.places)).toBeInTheDocument();
    expect(legend.queryByText(zoneLabel)).not.toBeInTheDocument();
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
});
