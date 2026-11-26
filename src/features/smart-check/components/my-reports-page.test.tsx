import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import { buildReportRow, toMyReportRow } from '@/test/factories/smart-check-report';
import {
  CREATED_SHARE_TOKEN,
  SEEDED_REPORT,
  SIGNED_PDF_URL,
} from '@/test/msw/handlers/smart-check';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';
import { startDownload } from '../report-pdf.utils';

vi.mock('../report-pdf.utils', () => ({ startDownload: vi.fn() }));

function reportCard(address: string) {
  return screen.getByRole('article', { name: address });
}

describe('MyReportsPage', { timeout: 20_000 }, () => {
  it('lists the own reports with their status, a link to each and their PDF', async () => {
    await renderAppRoute('/account/reports', { auth: signedInAs() });

    const list = await screen.findByRole('list', { name: roCommon.panel.account.nav.reports });
    expect(list).toBeInTheDocument();
    expect(screen.getByText(ro.myReports.count_one.replace('{{count}}', '1'))).toBeInTheDocument();
    const card = reportCard(SEEDED_REPORT.address_text);
    expect(within(card).getByText(roCommon.brand.smartcheck)).toBeInTheDocument();
    expect(within(card).getByText(ro.status.ready)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: ro.myReports.open })).toHaveAttribute(
      'href',
      `/check/result/${SEEDED_REPORT.id}`,
    );
    expect(
      within(card).getByRole('button', { name: ro.report.pdf.download.ro }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: ro.report.pdf.download.en }),
    ).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: ro.report.share.action })).toBeInTheDocument();
  });

  it('downloads the PDF through a signed link', async () => {
    const { user } = await renderAppRoute('/account/reports', { auth: signedInAs() });

    await user.click(await screen.findByRole('button', { name: ro.report.pdf.download.en }));

    await vi.waitFor(() => {
      expect(startDownload).toHaveBeenCalledWith(SIGNED_PDF_URL.en);
    });
  });

  it('shows reports still in the queue or that failed without PDF or sharing', async () => {
    const queued = buildReportRow({ status: 'queued', address_text: 'Strada Paris 3, Timișoara' });
    const failed = buildReportRow({ status: 'failed', address_text: 'Strada Arieș 9, Timișoara' });
    server.use(
      http.get(supabaseUrl('/rest/v1/online_reports'), () =>
        HttpResponse.json([toMyReportRow(queued), toMyReportRow(failed)], {
          headers: { 'Content-Range': '0-1/2' },
        }),
      ),
    );
    await renderAppRoute('/account/reports', { auth: signedInAs() });

    await screen.findByRole('heading', { level: 2, name: queued.address_text });
    const queuedCard = reportCard(queued.address_text);
    expect(within(queuedCard).getByText(ro.status.queued)).toBeInTheDocument();
    expect(within(queuedCard).getByText(ro.myReports.note.queued)).toBeInTheDocument();
    expect(
      within(queuedCard).queryByRole('button', { name: ro.report.pdf.download.ro }),
    ).toBeNull();
    const failedCard = reportCard(failed.address_text);
    expect(within(failedCard).getByText(ro.status.failed)).toBeInTheDocument();
    expect(within(failedCard).queryByRole('button', { name: ro.report.share.action })).toBeNull();
  });

  it('creates a share link and revokes the active one', async () => {
    const { user } = await renderAppRoute('/account/reports', { auth: signedInAs() });

    await user.click(await screen.findByRole('button', { name: ro.report.share.action }));
    const dialog = await screen.findByRole('dialog', { name: ro.report.share.title });
    expect(await within(dialog).findByText(ro.report.share.none)).toBeInTheDocument();

    let revokedReportId: unknown;
    server.use(
      http.get(supabaseUrl('/rest/v1/report_share_links'), () =>
        HttpResponse.json({
          id: 'c0000000-0000-4000-8000-000000000001',
          expires_at: '2026-11-30T12:00:00.000Z',
          created_at: '2026-11-23T12:00:00.000Z',
        }),
      ),
      http.post(supabaseUrl('/rest/v1/rpc/revoke_report_share_link'), async ({ request }) => {
        const body: unknown = await request.json();
        revokedReportId =
          typeof body === 'object' && body !== null && 'p_report_id' in body
            ? body.p_report_id
            : undefined;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await user.click(within(dialog).getByRole('button', { name: ro.report.share.create }));

    const linkField = await within(dialog).findByRole('textbox', {
      name: ro.report.share.newLink,
    });
    expect(linkField).toHaveValue(
      `${env.siteUrl}/check/result/${SEEDED_REPORT.id}?share=${CREATED_SHARE_TOKEN}`,
    );
    expect(await within(dialog).findByText(ro.report.share.active)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: ro.report.share.revoke }));

    await vi.waitFor(() => {
      expect(revokedReportId).toBe(SEEDED_REPORT.id);
    });
  });

  it('shows the empty state with a way to check an address', async () => {
    server.use(
      http.get(supabaseUrl('/rest/v1/online_reports'), () =>
        HttpResponse.json([], { headers: { 'Content-Range': '*/0' } }),
      ),
    );
    await renderAppRoute('/account/reports', { auth: signedInAs() });

    expect(await screen.findByText(ro.myReports.empty.title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: ro.myReports.empty.action })).toHaveAttribute(
      'href',
      '/check',
    );
  });
});
