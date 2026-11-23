import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs, signedOut } from '@/test/factories/auth';
import { buildReportRow } from '@/test/factories/smart-check-report';
import { SEEDED_REPORT, SEEDED_SHARE_TOKEN } from '@/test/msw/handlers/smart-check';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';
import { REPORT_TABS } from '../../report-chapter-meta';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

describe('ReportPage', { timeout: 20_000 }, () => {
  it('opens a ready report on the summary chapter with a tab for every chapter', async () => {
    await renderAppRoute(`/check/result/${SEEDED_REPORT.id}`, { auth: signedInAs() });

    expect(
      await screen.findByRole('heading', { level: 1, name: SEEDED_REPORT.address_text }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(REPORT_TABS.length);
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
      ro.report.frame.tabs.names.summary,
    );
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'report-tab-summary');
  });

  it('shows one chapter at a time and switches from its tab', async () => {
    const { user } = await renderAppRoute(`/check/result/${SEEDED_REPORT.id}`, {
      auth: signedInAs(),
    });

    await user.click(
      await screen.findByRole('tab', { name: new RegExp(ro.report.frame.tabs.names.safety) }),
    );

    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
      ro.report.frame.tabs.names.safety,
    );
    expect(
      screen.getByRole('heading', { level: 2, name: ro.report.chapters.safety.title }),
    ).toBeInTheDocument();
  });

  it('opens a shared report without an account', async () => {
    await renderAppRoute(`/check/result/${SEEDED_REPORT.id}?share=${SEEDED_SHARE_TOKEN}`, {
      auth: signedOut,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: SEEDED_REPORT.address_text }),
    ).toBeInTheDocument();
  });

  it('says the report is being prepared while it is generating', async () => {
    const generating = buildReportRow({ status: 'generating', result: {} });
    server.use(
      http.get(supabaseUrl('/rest/v1/online_reports'), () => HttpResponse.json([generating])),
    );
    await renderAppRoute(`/check/result/${generating.id}`, { auth: signedInAs() });

    expect(await screen.findByText(ro.report.state.generating.title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: ro.report.state.backToReports })).toHaveAttribute(
      'href',
      '/account/reports',
    );
  });

  it('shows an error state for a failed report', async () => {
    const failed = buildReportRow({ status: 'failed', result: {} });
    server.use(http.get(supabaseUrl('/rest/v1/online_reports'), () => HttpResponse.json([failed])));
    await renderAppRoute(`/check/result/${failed.id}`, { auth: signedInAs() });

    expect(await screen.findByRole('alert')).toHaveTextContent(ro.report.state.failed.title);
  });
});
