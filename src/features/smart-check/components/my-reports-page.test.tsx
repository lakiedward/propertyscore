import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import { SEEDED_REPORT } from '@/test/msw/handlers/smart-check';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

describe('MyReportsPage', { timeout: 20_000 }, () => {
  it('lists the own reports with their status and a link to each', async () => {
    await renderAppRoute('/account/reports', { auth: signedInAs() });

    const list = await screen.findByRole('list', { name: roCommon.panel.account.nav.reports });
    expect(list).toBeInTheDocument();
    expect(screen.getByText(ro.myReports.count_one.replace('{{count}}', '1'))).toBeInTheDocument();
    expect(screen.getByText(ro.status.ready)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: new RegExp(SEEDED_REPORT.address_text) }),
    ).toHaveAttribute('href', `/check/result/${SEEDED_REPORT.id}`);
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
