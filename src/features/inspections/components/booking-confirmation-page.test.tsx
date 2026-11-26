import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/inspections.json';
import { signedInAs } from '@/test/factories/auth';
import { buildBookedInspection } from '@/test/factories/booked-inspection';
import { postgrestRows } from '@/test/msw/postgrest-rows';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const BOOKED = buildBookedInspection();

describe('BookingConfirmationPage', { timeout: 20_000 }, () => {
  it('shows the booked inspection with its number, address and home', async () => {
    server.use(
      http.get(supabaseUrl('/rest/v1/inspections'), ({ request }) =>
        postgrestRows(request, [BOOKED]),
      ),
    );
    await renderAppRoute(`/inspection/confirmation/${BOOKED.id}`, { auth: signedInAs('user') });

    expect(
      await screen.findByRole('heading', { level: 1, name: ro.booking.confirmation.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        ro.booking.confirmation.eyebrow.replace('{{number}}', String(BOOKED.number)),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Str\. Școlii 12, ap\. 7/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: ro.booking.confirmation.view })).toHaveAttribute(
      'href',
      '/account/appointments',
    );
  });

  it('shows the not found page for a booking that does not exist', async () => {
    server.use(
      http.get(supabaseUrl('/rest/v1/inspections'), () =>
        HttpResponse.json(
          { code: 'PGRST116', message: 'no rows', details: null, hint: null },
          { status: 406 },
        ),
      ),
    );
    await renderAppRoute(`/inspection/confirmation/${BOOKED.id}`, { auth: signedInAs('user') });

    expect(await screen.findByText(roCommon.pages.notFound.title)).toBeInTheDocument();
  });
});
