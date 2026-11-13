import { screen, waitFor, within } from '@testing-library/react';
import ro from '@/i18n/locales/ro/myListings.json';
import { signedInAs } from '@/test/factories/auth';
import { buildMyListing } from '@/test/factories/my-listing';
import { myListingsResponse, SEEDED_MY_LISTINGS } from '@/test/msw/handlers/my-listings';
import { server } from '@/test/msw/server';
import { renderAppRoute } from '@/test/render';

const [REJECTED, BLOCKED] = SEEDED_MY_LISTINGS;

function cardOf(title: string) {
  return screen.getByRole('article', { name: title });
}

describe('MyListingsPage', { timeout: 20_000 }, () => {
  it('shows each listing with its status, the admin reason and the right action', async () => {
    await renderAppRoute('/account/listings', { auth: signedInAs() });

    expect(await screen.findByRole('list', { name: ro.list.label })).toBeInTheDocument();

    const rejected = cardOf(REJECTED?.title ?? '');
    expect(within(rejected).getByText(ro.status.rejected)).toBeInTheDocument();
    expect(within(rejected).getByText(REJECTED?.decisions[0]?.message ?? '')).toBeInTheDocument();
    expect(within(rejected).getByRole('link', { name: ro.list.edit })).toHaveAttribute(
      'href',
      `/account/listings/${REJECTED?.id ?? ''}`,
    );

    const blocked = cardOf(BLOCKED?.title ?? '');
    expect(within(blocked).getByText(ro.status.blocked)).toBeInTheDocument();
    expect(within(blocked).queryByRole('link')).not.toBeInTheDocument();
    expect(within(blocked).queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens a copy of a published listing for editing and keeps the published one live', async () => {
    const published = buildMyListing({ status: 'approved', title: 'Casă cu grădină, Freidorf' });
    const pendingCopy = buildMyListing({
      status: 'approved',
      title: 'Apartament 2 camere, Iosefin',
    });
    const copy = buildMyListing({ status: 'pending_approval', revision_of: pendingCopy.id });
    server.use(myListingsResponse([published, pendingCopy, copy]));
    const { user, router } = await renderAppRoute('/account/listings', { auth: signedInAs() });

    const waiting = cardOf(pendingCopy.title);
    expect(await within(waiting).findByText(ro.list.revision.pending_approval)).toBeInTheDocument();
    expect(within(waiting).queryByRole('button', { name: ro.list.edit })).not.toBeInTheDocument();
    expect(within(waiting).getByRole('button', { name: ro.list.view })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);

    await user.click(within(cardOf(published.title)).getByRole('button', { name: ro.list.edit }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(
        '/account/listings/c1000000-0000-4000-8000-000000008888',
      );
    });
  });

  it('invites the owner to add a first listing', async () => {
    server.use(myListingsResponse([]));
    await renderAppRoute('/account/listings', { auth: signedInAs() });

    expect(await screen.findByText(ro.list.empty.title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: ro.list.add })).toHaveAttribute(
      'href',
      '/account/listings/new',
    );
  });
});
