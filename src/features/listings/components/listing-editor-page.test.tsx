import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/myListings.json';
import { signedInAs } from '@/test/factories/auth';
import { SEEDED_MY_LISTINGS } from '@/test/msw/handlers/my-listings';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const [REJECTED, BLOCKED] = SEEDED_MY_LISTINGS;

function captureWrites() {
  const writes: string[] = [];
  server.use(
    http.patch(supabaseUrl('/rest/v1/listings'), ({ request }) => {
      writes.push('update');
      const id = new URL(request.url).searchParams.get('id')?.replace(/^eq\./, '');
      return HttpResponse.json([{ id }]);
    }),
    http.post(supabaseUrl('/rest/v1/rpc/submit_listing'), async ({ request }) => {
      const body: unknown = await request.json();
      writes.push(JSON.stringify(body));
      return HttpResponse.json({ id: REJECTED?.id, status: 'pending_approval' });
    }),
  );
  return writes;
}

describe('ListingEditorPage', { timeout: 20_000 }, () => {
  it('shows why a listing was rejected and resubmits the same listing after saving', async () => {
    const writes = captureWrites();
    const { user, router } = await renderAppRoute(`/account/listings/${REJECTED?.id ?? ''}`, {
      auth: signedInAs(),
    });

    expect(await screen.findByText(ro.notice.rejected.title)).toBeInTheDocument();
    expect(
      screen.getByText(
        ro.notice.reason.replace('{{message}}', REJECTED?.decisions[0]?.message ?? ''),
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: ro.editor.resubmit }));

    await waitFor(() => {
      expect(writes).toEqual(['update', JSON.stringify({ p_listing_id: REJECTED?.id })]);
    });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/account/listings');
    });
  });

  it('explains when the listing is not complete enough to submit', async () => {
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/submit_listing'), () =>
        HttpResponse.json(
          { code: 'P0001', message: 'listing_incomplete', details: null, hint: null },
          { status: 400 },
        ),
      ),
    );
    const { user } = await renderAppRoute(`/account/listings/${REJECTED?.id ?? ''}`, {
      auth: signedInAs(),
    });

    await user.click(await screen.findByRole('button', { name: ro.editor.resubmit }));

    expect(await screen.findByText(roCommon.errors.reasons.listing_incomplete)).toBeInTheDocument();
  });

  it('keeps a blocked listing read-only', async () => {
    await renderAppRoute(`/account/listings/${BLOCKED?.id ?? ''}`, { auth: signedInAs() });

    expect(await screen.findByText(ro.notice.blocked.title)).toBeInTheDocument();
    expect(screen.getByLabelText(ro.form.title.label)).toBeDisabled();
    expect(screen.queryByRole('button', { name: ro.editor.submit })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: ro.photos.add })).not.toBeInTheDocument();
  });

  it('asks for the required fields before saving a new listing', async () => {
    const { user } = await renderAppRoute('/account/listings/new', { auth: signedInAs() });

    await user.click(await screen.findByRole('button', { name: ro.editor.save }));

    expect(await screen.findByText(ro.form.pin.missing)).toBeInTheDocument();
    expect(screen.getAllByText(roCommon.validation.required).length).toBeGreaterThan(0);
  });
});
