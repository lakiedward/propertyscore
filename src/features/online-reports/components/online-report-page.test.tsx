import { act, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { toast } from 'sonner';
import { formatPercent } from '@/i18n/format';
import roOnlineReports from '@/i18n/locales/ro/onlineReports.json';
import { buildOnlineReport, buildReportResult } from '@/test/factories/online-report';
import {
  onlineReportResponse,
  SEEDED_ONLINE_REPORT,
  SEEDED_SHARE_TOKEN,
} from '@/test/msw/handlers/online-reports';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute, renderWithProviders } from '@/test/render';
import type { ChapterId } from '../online-report.utils';
import { OnlineReportPage } from './online-report-page';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const text = roOnlineReports;

function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{{${name}}}`, String(value)),
    template,
  );
}

function serveReport(report: ReturnType<typeof buildOnlineReport>) {
  server.use(http.get(supabaseUrl('/rest/v1/online_reports'), () => onlineReportResponse(report)));
}

async function renderReport(
  reportId: string,
  chapter: ChapterId = 'summary',
  onChapterChange = vi.fn(),
) {
  const view = await renderWithProviders(
    <OnlineReportPage reportId={reportId} chapter={chapter} onChapterChange={onChapterChange} />,
  );
  return { ...view, onChapterChange };
}

describe('OnlineReportPage', () => {
  it('shows the address, the zone score and what is good and what to watch', async () => {
    await renderReport(SEEDED_ONLINE_REPORT.id);

    expect(
      await screen.findByRole('heading', { level: 1, name: SEEDED_ONLINE_REPORT.address_text }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: fill(text.zone.scoreLabel, { score: 72 }) }),
    ).toBeVisible();
    expect(screen.getByText(text.band.veryGood)).toBeInTheDocument();
    expect(screen.getByText(/SC-2026-\d{5}/)).toBeInTheDocument();

    const strengths = screen.getByRole('region', { name: text.summary.strengths });
    const concerns = screen.getByRole('region', { name: text.summary.concerns });
    expect(
      within(strengths).getByText(
        fill(text.summary.scoreOf, { name: text.category.green, score: 84 }),
      ),
    ).toBeInTheDocument();
    expect(
      within(concerns).getByText(
        fill(text.summary.scoreOf, { name: text.category.noise, score: 40 }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: fill(text.summary.title, { best: text.category.green, worst: text.category.noise }),
      }),
    ).toBeInTheDocument();
  });

  it('marks the scores without data in the bars and says how many scores count', async () => {
    await renderReport(SEEDED_ONLINE_REPORT.id);

    expect(
      await screen.findByRole('img', {
        name: fill(text.summary.barMissing, { name: text.category.air }),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: fill(text.summary.barLabel, { name: text.category.green, score: 84, average: 34 }),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(fill(text.zone.partial_few, { count: 3 }))).toBeInTheDocument();
  });

  it('asks for another chapter from the tabs and from a highlight', async () => {
    const { user, onChapterChange } = await renderReport(SEEDED_ONLINE_REPORT.id);

    await user.click(await screen.findByRole('tab', { name: new RegExp(text.chapter.green) }));
    expect(onChapterChange).toHaveBeenLastCalledWith('green');

    await user.click(
      screen.getByRole('button', {
        name: new RegExp(fill(text.summary.scoreOf, { name: text.category.noise, score: 40 })),
      }),
    );
    expect(onChapterChange).toHaveBeenLastCalledWith('noise');
  });

  it('shows a scored chapter with its percentile, the city average and the distribution', async () => {
    await renderReport(SEEDED_ONLINE_REPORT.id, 'green');

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: fill(text.categoryChapter.title, { percent: '95 %', city: 'Timișoara' }).replace(
          ' %',
          ' %',
        ),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(text.method.green)).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: fill(text.categoryChapter.distributionLabel, {
          name: text.category.green,
          city: 'Timișoara',
          from: 80,
          to: 84,
        }),
      }),
    ).toBeInTheDocument();
  });

  it('says plainly when a chapter has no data yet', async () => {
    await renderReport(SEEDED_ONLINE_REPORT.id, 'air');

    expect(
      await screen.findByRole('heading', { level: 2, name: text.categoryChapter.titleMissing }),
    ).toBeInTheDocument();
    expect(screen.getByText(text.categoryChapter.leadMissing)).toBeInTheDocument();
  });

  it('shows the education and health scores inside the 15-minute chapter', async () => {
    const report = buildOnlineReport({
      result: buildReportResult({
        fifteen_minute: { score: 70 },
        education: { score: 80 },
        health: { score: 60 },
      }),
    });
    serveReport(report);

    await renderReport(report.id, 'fifteen_minute');

    expect(
      await screen.findByRole('heading', { name: text.categoryChapter.alsoInChapter }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        fill(text.categoryChapter.eyebrow, { name: text.category.education, score: 80 }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        fill(text.categoryChapter.eyebrow, { name: text.category.health, score: 60 }),
      ),
    ).toBeInTheDocument();
  });

  it('lists only the known sources with their dates', async () => {
    await renderReport(SEEDED_ONLINE_REPORT.id);

    const sources = await screen.findByRole('list', { name: text.how.sources });
    const items = within(sources).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent(text.source.osm);
  });

  it.each([
    ['pending_payment', text.status.pendingPaymentTitle],
    ['generating', text.status.generatingTitle],
    ['failed', text.status.failedTitle],
  ] as const)('shows the %s state instead of the report', async (status, title) => {
    const report = buildOnlineReport({ status, result: {}, overall_score: null });
    serveReport(report);

    await renderReport(report.id);

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});

describe('OnlineReportPage opened through a share link', () => {
  it('shows the report read-only, without the share button', async () => {
    await renderWithProviders(
      <OnlineReportPage
        reportId={SEEDED_ONLINE_REPORT.id}
        shareToken={SEEDED_SHARE_TOKEN}
        chapter="summary"
        onChapterChange={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: SEEDED_ONLINE_REPORT.address_text }),
    ).toBeInTheDocument();
    expect(screen.getByText(text.header.shared)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: text.share.open })).not.toBeInTheDocument();
  });
});

describe('the report route', () => {
  it('opens a shared report for a signed-out visitor', async () => {
    await renderAppRoute(`/check/result/${SEEDED_ONLINE_REPORT.id}?share=${SEEDED_SHARE_TOKEN}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: SEEDED_ONLINE_REPORT.address_text }),
    ).toBeInTheDocument();
  });

  it('sends a signed-out visitor without a share link to the login page', async () => {
    const { router } = await renderAppRoute(`/check/result/${SEEDED_ONLINE_REPORT.id}`);

    expect(router.state.location.pathname).toBe('/login');
  });
});

describe('OnlineReportPage when printed', () => {
  it('lays out every chapter one after another for the PDF and goes back after printing', async () => {
    await renderReport(SEEDED_ONLINE_REPORT.id);
    await screen.findByRole('heading', { level: 1, name: SEEDED_ONLINE_REPORT.address_text });
    const greenTitle = fill(text.categoryChapter.title, {
      percent: formatPercent(0.95),
      city: 'Timișoara',
    });
    expect(screen.queryByRole('heading', { name: greenTitle })).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    expect(screen.getByRole('heading', { name: greenTitle })).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('afterprint'));
    });
    expect(screen.queryByRole('heading', { name: greenTitle })).not.toBeInTheDocument();
  });

  it('opens the print window from the PDF button and says how to save the PDF', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const info = vi.spyOn(toast, 'info');
    const { user } = await renderReport(SEEDED_ONLINE_REPORT.id);

    await user.click(await screen.findByRole('button', { name: text.pdf.download }));

    expect(print).toHaveBeenCalledOnce();
    expect(info).toHaveBeenCalledWith(text.pdf.hint);
  });
});
