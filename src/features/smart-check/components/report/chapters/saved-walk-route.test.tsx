import { close, flush, init } from '@sentry/react';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import {
  buildSavedWalkReport,
  SAVED_WALK_POLYLINE,
  toSharedReportRow,
} from '@/test/factories/smart-check-report';
import { SEEDED_SHARE_TOKEN } from '@/test/msw/handlers/smart-check';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const routeStatuses = ro.report.chapters.fifteenMinute.map.routeStatus;
const routeRpc = supabaseUrl('/rest/v1/rpc/request_saved_report_walk_route');
const sendEvent = vi.fn<(envelope: unknown) => void>();

describe('saved report walking routes', { timeout: 20_000 }, () => {
  beforeAll(() => {
    init({
      dsn: 'https://public@example.test/1',
      defaultIntegrations: false,
      sendClientReports: false,
      transport: () => ({
        send: (envelope) => {
          sendEvent(envelope);
          return Promise.resolve({ statusCode: 200 });
        },
        flush: () => Promise.resolve(true),
      }),
    });
  });

  afterAll(async () => {
    await close();
  });

  it('draws frozen routes without a request and fetches a missing route only on selection', async () => {
    const report = buildSavedWalkReport();
    const requests: unknown[] = [];
    server.use(
      http.get(supabaseUrl('/rest/v1/online_reports'), () => HttpResponse.json([report])),
      http.post(routeRpc, async ({ request }) => {
        requests.push(await request.json());
        return HttpResponse.json(
          requests.length === 1
            ? { status: 'pending' }
            : { status: 'ready', polyline6: SAVED_WALK_POLYLINE },
        );
      }),
    );
    const { user } = await renderAppRoute(`/check/result/${report.id}?chapter=fifteenMinute`, {
      auth: signedInAs(),
    });

    const existing = await screen.findByRole('button', { name: /Supermarket/ });
    await user.click(existing);
    expect(await screen.findByRole('img', { name: 'fifteen-route' })).toBeInTheDocument();
    expect(requests).toHaveLength(0);

    const missing = screen.getByRole('button', { name: /Farmacie/ });
    await user.click(missing);
    expect(await screen.findByText(routeStatuses.pending)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'fifteen-route' })).not.toBeInTheDocument();
    expect(
      await screen.findByText(routeStatuses.ready, {}, { timeout: 4_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'fifteen-route' })).toBeInTheDocument();
    expect(missing).toHaveTextContent(/14 min/);
    expect(requests).toEqual([
      { p_report_id: report.id, p_category_key: 'pharmacy' },
      { p_report_id: report.id, p_category_key: 'pharmacy' },
    ]);
  });

  it('uses the active share credential and leaves the frozen time when no route is available', async () => {
    const report = buildSavedWalkReport();
    const requests: unknown[] = [];
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/resolve_report_share_link'), () =>
        HttpResponse.json([toSharedReportRow(report)]),
      ),
      http.post(routeRpc, async ({ request }) => {
        requests.push(await request.json());
        return HttpResponse.json({ status: 'unavailable' });
      }),
    );
    const { user } = await renderAppRoute(
      `/check/result/${report.id}?chapter=fifteenMinute&share=${SEEDED_SHARE_TOKEN}`,
    );
    const missing = await screen.findByRole('button', { name: /Farmacie/ });
    await user.click(missing);
    expect(await screen.findByText(routeStatuses.unavailable)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'fifteen-route' })).not.toBeInTheDocument();
    expect(missing).toHaveTextContent(/14 min/);
    expect(requests).toEqual([
      { p_report_id: report.id, p_category_key: 'pharmacy', p_token: SEEDED_SHARE_TOKEN },
    ]);
  });

  it.each([
    {
      response: () => HttpResponse.json({ status: 'ready', polyline6: SEEDED_SHARE_TOKEN + '!' }),
      message: 'Saved walk route response is invalid',
    },
    {
      response: () =>
        HttpResponse.json(
          { code: 'XX000', message: SEEDED_SHARE_TOKEN, details: SEEDED_SHARE_TOKEN },
          { status: 500 },
        ),
      message: 'Saved walk route request failed',
    },
    {
      response: () =>
        HttpResponse.json(
          { code: '42501', message: 'permission denied', details: null },
          { status: 403 },
        ),
      message: undefined,
    },
  ])(
    'sends only unexpected route errors to monitoring ($message)',
    async ({ response, message }) => {
      const report = buildSavedWalkReport();
      sendEvent.mockClear();
      server.use(
        http.post(supabaseUrl('/rest/v1/rpc/resolve_report_share_link'), () =>
          HttpResponse.json([toSharedReportRow(report)]),
        ),
        http.post(routeRpc, response),
      );
      const { user } = await renderAppRoute(
        `/check/result/${report.id}?chapter=fifteenMinute&share=${SEEDED_SHARE_TOKEN}`,
      );
      const missing = await screen.findByRole('button', { name: /Farmacie/ });
      await user.click(missing);
      expect(await screen.findByText(routeStatuses.unavailable)).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: 'fifteen-route' })).not.toBeInTheDocument();
      expect(missing).toHaveTextContent(/14 min/);
      await flush(2_000);
      if (message) {
        expect(sendEvent).toHaveBeenCalledTimes(1);
        const sent = JSON.stringify(sendEvent.mock.calls[0]?.[0]);
        expect(sent).toContain(message);
        expect(sent).not.toContain(SEEDED_SHARE_TOKEN);
      } else {
        expect(sendEvent).not.toHaveBeenCalled();
      }
    },
  );
});
