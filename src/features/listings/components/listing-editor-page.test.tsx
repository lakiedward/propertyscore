import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/myListings.json';
import { signedInAs } from '@/test/factories/auth';
import { buildMyListing } from '@/test/factories/my-listing';
import { myListingsResponse, SEEDED_MY_LISTINGS } from '@/test/msw/handlers/my-listings';
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

function stubObjectUrls() {
  Object.assign(URL, {
    createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
    revokeObjectURL: vi.fn(),
  });
}

function withIndex(text: string, index: number) {
  return text.replace('{{index}}', String(index));
}

function sectionButton(title: string) {
  return screen.findByRole('button', { name: new RegExp(`^${title}`) });
}

function withCount(text: string, count: number) {
  return text.replace('{{count}}', String(count));
}

describe('ListingEditorPage', { timeout: 20_000 }, () => {
  it('shows why a listing was rejected and resubmits the same listing', async () => {
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

  it('explains when the server finds the listing not complete enough to submit', async () => {
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

  it('sends the owner back to the list when the listing cannot be edited', async () => {
    const { router } = await renderAppRoute(`/account/listings/${BLOCKED?.id ?? ''}`, {
      auth: signedInAs(),
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/account/listings');
    });
  });

  it('edits a copy of a published listing and lets the owner drop it', async () => {
    const published = buildMyListing({ status: 'approved' });
    const copy = buildMyListing({ status: 'draft', revision_of: published.id });
    const discarded: unknown[] = [];
    server.use(
      myListingsResponse([published, copy]),
      http.post(supabaseUrl('/rest/v1/rpc/discard_listing_revision'), async ({ request }) => {
        discarded.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, router } = await renderAppRoute(`/account/listings/${copy.id}`, {
      auth: signedInAs(),
    });

    expect(await screen.findByText(ro.notice.revision.description)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ro.editor.submitChanges })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: ro.notice.revision.discard }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: ro.notice.revision.discard }));

    await waitFor(() => {
      expect(discarded).toEqual([{ p_revision_id: copy.id }]);
    });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/account/listings');
    });
  });

  it('shows every section on one page and marks the missing fields when the owner moves on', async () => {
    const { user } = await renderAppRoute('/account/listings/new', { auth: signedInAs() });

    const details = await sectionButton(ro.sections.details);
    expect(details).toHaveAttribute('aria-expanded', 'true');
    for (const title of [ro.sections.photos, ro.sections.address, ro.sections.text]) {
      expect(await sectionButton(title)).toHaveAttribute('aria-expanded', 'false');
    }

    await user.click(await sectionButton(ro.sections.address));

    expect(await screen.findByText(withCount(ro.sections.missing_few, 4))).toBeInTheDocument();
    expect(screen.getAllByText(roCommon.validation.required).length).toBeGreaterThan(0);
    expect(details).toHaveAttribute('aria-expanded', 'true');
  });

  it('swaps the apartment details for the house details when the owner picks Casă', async () => {
    const { user } = await renderAppRoute('/account/listings/new', { auth: signedInAs() });

    expect(await screen.findByRole('combobox', { name: ro.form.floor.label })).toBeInTheDocument();

    await user.click(
      screen.getByRole('radio', { name: new RegExp(ro.wizard.propertyType.house.label) }),
    );

    expect(
      await screen.findByRole('combobox', { name: roCommon.listingDetails.fields.houseType }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(roCommon.listingDetails.fields.landArea)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: ro.form.floor.label })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: ro.editor.save }));

    expect(screen.getByLabelText(roCommon.listingDetails.fields.landArea)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(
      screen.getByRole('combobox', { name: roCommon.listingDetails.fields.houseType }),
    ).toHaveAttribute('aria-invalid', 'true');
  });

  it('opens every unfinished section when saving an empty draft', async () => {
    const { user } = await renderAppRoute('/account/listings/new', { auth: signedInAs() });

    await user.click(await screen.findByRole('button', { name: ro.editor.save }));

    expect(await screen.findByText(ro.sections.markedErrors)).toBeInTheDocument();
    for (const title of [
      ro.sections.details,
      ro.sections.photos,
      ro.sections.address,
      ro.sections.text,
    ]) {
      expect(await sectionButton(title)).toHaveAttribute('aria-expanded', 'true');
    }
    expect(screen.getByLabelText(ro.form.title.label)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(withCount(ro.sections.photosMissing_few, 5))).toBeInTheDocument();
  });

  it('takes photos before the draft is saved and still asks for the missing ones', async () => {
    stubObjectUrls();
    const { user } = await renderAppRoute('/account/listings/new?section=photos', {
      auth: signedInAs(),
    });

    await user.upload(screen.getByLabelText(ro.photos.add, { selector: 'input' }), [
      new File(['a'], 'living.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'kitchen.png', { type: 'image/png' }),
    ]);

    expect(await screen.findByAltText(ro.photos.alt.replace('{{index}}', '2'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: ro.editor.save }));

    expect(
      await screen.findByText(withCount(ro.sections.photosMissing_few, 3)),
    ).toBeInTheDocument();
  });

  it('keeps a listing with too few photos from being sent and says how many are missing', async () => {
    const writes = captureWrites();
    const draft = buildMyListing({ photos: buildMyListing().photos.slice(0, 2) });
    server.use(myListingsResponse([draft]));
    const { user } = await renderAppRoute(`/account/listings/${draft.id}`, {
      auth: signedInAs(),
    });

    await user.click(await screen.findByRole('button', { name: ro.editor.submit }));

    expect(
      await screen.findByText(withCount(ro.sections.photosMissing_few, 3)),
    ).toBeInTheDocument();
    expect(await sectionButton(ro.sections.photos)).toHaveAttribute('aria-expanded', 'true');
    expect(writes).toEqual([]);
  });

  it('reorders photos chosen before the draft is saved', async () => {
    stubObjectUrls();
    const { user } = await renderAppRoute('/account/listings/new?section=photos', {
      auth: signedInAs(),
    });

    await user.upload(screen.getByLabelText(ro.photos.add, { selector: 'input' }), [
      new File(['a'], 'living.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'kitchen.jpg', { type: 'image/jpeg' }),
    ]);
    await user.click(
      await screen.findByRole('button', { name: withIndex(ro.photos.moveEarlier, 2) }),
    );

    expect(screen.getByAltText(withIndex(ro.photos.alt, 1))).toHaveAttribute(
      'src',
      'blob:kitchen.jpg',
    );
    expect(screen.getByAltText(withIndex(ro.photos.alt, 2))).toHaveAttribute(
      'src',
      'blob:living.jpg',
    );
  });

  it('saves the new photo order of a saved draft', async () => {
    const draft = buildMyListing();
    const bodies: unknown[] = [];
    server.use(
      myListingsResponse([draft]),
      http.post(supabaseUrl('/rest/v1/rpc/reorder_listing_photos'), async ({ request }) => {
        bodies.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderAppRoute(`/account/listings/${draft.id}?section=photos`, {
      auth: signedInAs(),
    });

    await user.click(
      await screen.findByRole('button', { name: withIndex(ro.photos.moveLater, 1) }),
    );

    const [first, second, ...rest] = draft.photos.map((photo) => photo.id);
    await waitFor(() => {
      expect(bodies).toEqual([{ p_listing_id: draft.id, p_photo_ids: [second, first, ...rest] }]);
    });
  });

  it('shows a refused value under its field and opens the section that holds it', async () => {
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
    const { user } = await renderAppRoute(
      `/account/listings/${REJECTED?.id ?? ''}?section=contact`,
      { auth: signedInAs() },
    );

    expect(await sectionButton(ro.sections.details)).toHaveAttribute('aria-expanded', 'false');
    await user.click(await screen.findByRole('button', { name: ro.editor.saveChanges }));

    expect(await screen.findByText(roCommon.errors.reasons.value_out_of_range)).toBeInTheDocument();
    expect(await sectionButton(ro.sections.details)).toHaveAttribute('aria-expanded', 'true');
  });
});
