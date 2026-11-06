import { screen, within } from '@testing-library/react';
import ro from '@/i18n/locales/ro/myListings.json';
import { signedInAs } from '@/test/factories/auth';
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
    expect(within(rejected).getByRole('button', { name: ro.list.preview })).toBeInTheDocument();

    const blocked = cardOf(BLOCKED?.title ?? '');
    expect(within(blocked).getByText(ro.status.blocked)).toBeInTheDocument();
    expect(within(blocked).getByRole('link', { name: ro.list.view })).toBeInTheDocument();
    expect(
      within(blocked).queryByRole('button', { name: ro.list.preview }),
    ).not.toBeInTheDocument();
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
