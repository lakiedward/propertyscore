import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { formatDate } from '@/i18n/format';
import roOnlineReports from '@/i18n/locales/ro/onlineReports.json';
import { CREATED_SHARE_TOKEN, SEEDED_ONLINE_REPORT } from '@/test/msw/handlers/online-reports';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { ReportShareDialog } from './report-share-dialog';

const text = roOnlineReports.share;

async function openDialog() {
  const view = await renderWithProviders(<ReportShareDialog reportId={SEEDED_ONLINE_REPORT.id} />);
  await view.user.click(screen.getByRole('button', { name: text.open }));
  return view;
}

describe('ReportShareDialog', () => {
  it('creates a link with the chosen expiry and copies it', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/create_report_share_link'), async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(CREATED_SHARE_TOKEN);
      }),
    );
    const { user } = await openDialog();

    await user.click(await screen.findByRole('radio', { name: text.expiry.month }));
    await user.click(screen.getByRole('button', { name: text.create }));

    const link = await screen.findByRole('textbox', { name: text.linkLabel });
    expect(link).toHaveValue(
      `${window.location.origin}/check/result/${SEEDED_ONLINE_REPORT.id}?share=${CREATED_SHARE_TOKEN}`,
    );
    expect(bodies).toEqual([{ p_report_id: SEEDED_ONLINE_REPORT.id, p_expires_in_days: 30 }]);
    expect(screen.getByText(text.onlyOnce)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: text.copy }));
    await expect(navigator.clipboard.readText()).resolves.toBe(
      `${window.location.origin}/check/result/${SEEDED_ONLINE_REPORT.id}?share=${CREATED_SHARE_TOKEN}`,
    );
  });

  it('shows the active link and turns it off', async () => {
    let isActive = true;
    server.use(
      http.get(supabaseUrl('/rest/v1/report_share_links'), () =>
        HttpResponse.json(
          isActive ? [{ id: 'l1', created_at: '2026-11-01T10:00:00Z', expires_at: null }] : [],
        ),
      ),
      http.post(supabaseUrl('/rest/v1/rpc/revoke_report_share_link'), () => {
        isActive = false;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await openDialog();

    expect(
      await screen.findByText(text.active.replace('{{date}}', formatDate('2026-11-01T10:00:00Z'))),
    ).toBeInTheDocument();
    expect(screen.getByText(text.lostLink)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: text.revoke }));

    expect(await screen.findByRole('button', { name: text.create })).toBeInTheDocument();
    expect(isActive).toBe(false);
  });
});
