import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { loadFeatureNamespaces } from '@/i18n/i18n';
import ro from '@/i18n/locales/ro/listings.json';
import roMyListings from '@/i18n/locales/ro/myListings.json';
import { buildListing } from '@/test/factories/listing';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { OwnerListings } from './owner-listings';

const OWNER_ID = 'd0000000-0000-4000-8000-000000000001';

const PUBLISHED = buildListing({ status: 'approved', title: 'Apartament cu vedere la parc' });
const IN_REVIEW = buildListing({ status: 'pending_approval', title: 'Casă cu grădină' });

function ownerListingsResponse(response: () => Response | Promise<Response>) {
  return http.get(supabaseUrl('/rest/v1/listings'), response);
}

describe('OwnerListings', () => {
  beforeAll(async () => {
    await loadFeatureNamespaces(['myListings']);
  });

  it('shows placeholders, not an empty or failed list, while the listings load', async () => {
    server.use(ownerListingsResponse(() => new Promise<Response>(() => undefined)));
    await renderWithProviders(<OwnerListings ownerId={OWNER_ID} />);

    expect(screen.queryByText(ro.owner.empty.title)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('says when the listings could not load', async () => {
    server.use(
      ownerListingsResponse(() => HttpResponse.json({ message: 'boom' }, { status: 500 })),
    );
    await renderWithProviders(<OwnerListings ownerId={OWNER_ID} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(ro.owner.error.title);
  });

  it('says when the account has no listings', async () => {
    server.use(ownerListingsResponse(() => HttpResponse.json([])));
    await renderWithProviders(<OwnerListings ownerId={OWNER_ID} />);

    expect(await screen.findByText(ro.owner.empty.title)).toBeInTheDocument();
  });

  it('links only a published listing to its public page and shows each status', async () => {
    server.use(ownerListingsResponse(() => HttpResponse.json([PUBLISHED, IN_REVIEW])));
    await renderWithProviders(<OwnerListings ownerId={OWNER_ID} />);

    expect(await screen.findByRole('link', { name: PUBLISHED.title })).toHaveAttribute(
      'href',
      `/listings/${PUBLISHED.id}`,
    );
    expect(screen.getByText(IN_REVIEW.title)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: IN_REVIEW.title })).not.toBeInTheDocument();
    expect(screen.getByText(roMyListings.status.pending_approval)).toBeInTheDocument();
  });
});
