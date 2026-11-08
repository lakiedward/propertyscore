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

function stepTitle(key: keyof typeof ro.wizard.titles) {
  return screen.findByRole('heading', { level: 2, name: ro.wizard.titles[key] });
}

describe('ListingEditorPage', { timeout: 20_000 }, () => {
  it('shows why a listing was rejected and resubmits the same listing from the last step', async () => {
    const writes = captureWrites();
    const { user, router } = await renderAppRoute(
      `/account/listings/${REJECTED?.id ?? ''}?step=6`,
      { auth: signedInAs() },
    );

    expect(await screen.findByText(ro.notice.rejected.title)).toBeInTheDocument();
    expect(
      screen.getByText(
        ro.notice.reason.replace('{{message}}', REJECTED?.decisions[0]?.message ?? ''),
      ),
    ).toBeInTheDocument();
    expect(await stepTitle('contact')).toBeInTheDocument();

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
    const { user } = await renderAppRoute(`/account/listings/${REJECTED?.id ?? ''}?step=6`, {
      auth: signedInAs(),
    });

    await user.click(await screen.findByRole('button', { name: ro.editor.resubmit }));

    expect(await screen.findByText(roCommon.errors.reasons.listing_incomplete)).toBeInTheDocument();
  });

  it('shows a blocked listing as a read-only preview', async () => {
    await renderAppRoute(`/account/listings/${BLOCKED?.id ?? ''}`, { auth: signedInAs() });

    expect(await screen.findByText(ro.notice.blocked.title)).toBeInTheDocument();
    expect(screen.getByText(ro.overview.previewLabel)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: ro.wizard.stepsLabel })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: ro.editor.submit })).not.toBeInTheDocument();
  });

  it('moves through the steps and stops at a step with a missing field', async () => {
    const { user } = await renderAppRoute('/account/listings/new', { auth: signedInAs() });

    expect(await stepTitle('type')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: ro.wizard.continue }));

    expect(await stepTitle('text')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: ro.wizard.continue }));

    expect(await screen.findByText(roCommon.validation.required)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: ro.wizard.titles.text }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(ro.form.title.label), 'Apartament 2 camere, Fabric');
    await user.click(screen.getByRole('button', { name: ro.wizard.continue }));

    expect(await stepTitle('details')).toBeInTheDocument();
  });

  it('shows a refused value under its field on the step that holds it', async () => {
    server.use(
      http.patch(supabaseUrl('/rest/v1/listings'), () =>
        HttpResponse.json(
          {
            code: '23514',
            message:
              'new row for relation "listings" violates check constraint "listings_year_built_check"',
            details: null,
            hint: null,
          },
          { status: 400 },
        ),
      ),
    );
    const { user } = await renderAppRoute(`/account/listings/${REJECTED?.id ?? ''}?step=6`, {
      auth: signedInAs(),
    });

    await user.click(await screen.findByRole('button', { name: ro.editor.saveChanges }));

    expect(await stepTitle('details')).toBeInTheDocument();
    expect(await screen.findByText(roCommon.errors.reasons.value_out_of_range)).toBeInTheDocument();
  });

  it('takes the owner back to the first unfinished step when saving an empty draft', async () => {
    const { user } = await renderAppRoute('/account/listings/new?step=3', { auth: signedInAs() });

    await user.click(await screen.findByRole('button', { name: ro.editor.save }));

    expect(await stepTitle('text')).toBeInTheDocument();
  });
});
