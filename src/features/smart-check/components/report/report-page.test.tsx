import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import en from '@/i18n/locales/en/smartCheck.json';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs, signedOut } from '@/test/factories/auth';
import { buildProfile } from '@/test/factories/profile';
import { FREIDORF_REPORT_RESULT, buildReportRow } from '@/test/factories/smart-check-report';
import { SEEDED_REPORT, SEEDED_SHARE_TOKEN, SIGNED_PDF_URL } from '@/test/msw/handlers/smart-check';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';
import { REPORT_TABS } from '../../report-chapter-meta';
import { startDownload } from '../../report-pdf.utils';
import { REPORT_CATEGORY_KEYS } from '../../report.schemas';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));
vi.mock('../../report-pdf.utils', () => ({ startDownload: vi.fn() }));

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
      screen.getByRole('heading', { level: 2, name: ro.report.chapters.safety.headline }),
    ).toBeInTheDocument();
  });

  it.each([
    ['ro', ro],
    ['en', en],
  ] as const)('discloses missing scores and chapter data in %s', async (locale, strings) => {
    const noScore = { score: null, city_avg: null, percentile: null, histogram: [] };
    const categories = Object.fromEntries(
      REPORT_CATEGORY_KEYS.map((key) => [key, { ...noScore, weight: 0 }]),
    );
    const missingSections = Object.fromEntries(
      REPORT_CATEGORY_KEYS.map((key) => [key, { status: 'no_data' }]),
    );
    const row = buildReportRow({
      overall_score: null,
      result: {
        ...FREIDORF_REPORT_RESULT,
        ...missingSections,
        investment: { status: 'no_data' },
        categories,
        zone: noScore,
      },
    });
    server.use(
      http.get(supabaseUrl('/rest/v1/online_reports'), () => HttpResponse.json([row])),
      http.get(supabaseUrl('/rest/v1/profiles'), () => HttpResponse.json(buildProfile({ locale }))),
    );
    const { user } = await renderAppRoute(`/check/result/${row.id}`, {
      auth: signedInAs(),
      locale,
    });
    const { chapters, frame } = strings.report;

    expect(await screen.findByText(frame.hero.leadNoScores)).toBeVisible();
    expect(screen.queryByText(frame.hero.leadNoWeak)).not.toBeInTheDocument();
    const panel = within(screen.getByRole('tabpanel'));
    expect(panel.getByRole('heading', { name: chapters.summary.headlineNoScores })).toBeVisible();
    expect(panel.queryByRole('heading', { name: chapters.summary.mapBand.title })).toBeNull();
    expect(panel.queryByRole('heading', { name: chapters.summary.scores.title })).toBeNull();

    await user.click(screen.getByRole('tab', { name: new RegExp(frame.tabs.names.accessibility) }));
    expect(
      await within(screen.getByRole('tabpanel')).findByRole('heading', {
        name: chapters.accessibility.headlineNoData,
      }),
    ).toBeVisible();

    await user.click(screen.getByRole('tab', { name: new RegExp(frame.tabs.names.green) }));
    const green = within(screen.getByRole('tabpanel'));
    expect(await green.findByText(chapters.green.noData)).toBeVisible();
    expect(green.queryByRole('heading', { name: chapters.green.headlineNone })).toBeNull();

    await user.click(screen.getByRole('tab', { name: new RegExp(frame.tabs.names.airIndustry) }));
    expect(
      await within(screen.getByRole('tabpanel')).findByRole('heading', {
        name: chapters.airIndustry.headlineNoData,
      }),
    ).toBeVisible();
  });

  it('lets the owner download either PDF and open the share dialog', async () => {
    const { user } = await renderAppRoute(`/check/result/${SEEDED_REPORT.id}`, {
      auth: signedInAs(),
    });

    await user.click(await screen.findByRole('button', { name: ro.report.pdf.download.ro }));
    await vi.waitFor(() => {
      expect(startDownload).toHaveBeenCalledWith(SIGNED_PDF_URL.ro);
    });
    await user.click(screen.getByRole('button', { name: ro.report.pdf.download.en }));
    await vi.waitFor(() => {
      expect(startDownload).toHaveBeenCalledWith(SIGNED_PDF_URL.en);
    });

    await user.click(screen.getByRole('button', { name: ro.report.share.action }));
    expect(await screen.findByRole('dialog', { name: ro.report.share.title })).toBeInTheDocument();
  });

  it('changes the web language and downloads both PDFs without an account', async () => {
    const { user } = await renderAppRoute(
      `/check/result/${SEEDED_REPORT.id}?share=${SEEDED_SHARE_TOKEN}`,
      { auth: signedOut },
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: SEEDED_REPORT.address_text }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: ro.report.share.action })).toBeNull();

    const language = screen.getByRole('radiogroup', { name: ro.report.language });
    await user.click(within(language).getByRole('radio', { name: roCommon.language.en }));
    expect(
      await screen.findByRole('tab', {
        name: new RegExp(en.report.frame.tabs.names.summary),
        selected: true,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(SEEDED_REPORT.address_text);

    await user.click(screen.getByRole('button', { name: en.report.pdf.download.ro }));
    await vi.waitFor(() => {
      expect(startDownload).toHaveBeenCalledWith(SIGNED_PDF_URL.ro);
    });
    await user.click(screen.getByRole('button', { name: en.report.pdf.download.en }));
    await vi.waitFor(() => {
      expect(startDownload).toHaveBeenCalledWith(SIGNED_PDF_URL.en);
    });
  });

  it('does not open a report from a revoked or unknown link', async () => {
    await renderAppRoute(`/check/result/${SEEDED_REPORT.id}?share=${'c'.repeat(48)}`, {
      auth: signedOut,
    });

    expect(await screen.findByRole('heading', { level: 1 })).not.toHaveTextContent(
      SEEDED_REPORT.address_text,
    );
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
