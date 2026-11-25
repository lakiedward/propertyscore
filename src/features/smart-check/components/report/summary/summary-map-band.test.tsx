import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import ro from '@/i18n/locales/ro/smartCheck.json';
import { signedInAs } from '@/test/factories/auth';
import { buildSavedWalkReport } from '@/test/factories/smart-check-report';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const copy = ro.report.chapters.summary;

describe('SummaryMapBand', () => {
  it('counts saved walking places without needing route geometry', async () => {
    const report = buildSavedWalkReport('straight_line');
    server.use(http.get(supabaseUrl('/rest/v1/online_reports'), () => HttpResponse.json([report])));
    const { user } = await renderAppRoute(`/check/result/${report.id}`, { auth: signedInAs() });
    const teaser = within(await screen.findByRole('region', { name: copy.mapBand.title }));

    expect(teaser.getByText(copy.mapBand.text)).toBeInTheDocument();
    expect(within(teaser.getByText(copy.mapBand.walk)).getByText('2')).toBeInTheDocument();

    await user.click(teaser.getByRole('button', { name: copy.mapBand.open }));

    expect(screen.getByText(copy.explorer.walkNote.estimated)).toBeInTheDocument();
    expect(screen.queryByText(copy.explorer.walkNote.routed)).not.toBeInTheDocument();
  });
});
