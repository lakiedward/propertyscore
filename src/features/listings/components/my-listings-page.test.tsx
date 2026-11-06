import { screen, within } from '@testing-library/react';
import ro from '@/i18n/locales/ro/myListings.json';
import { signedInAs } from '@/test/factories/auth';
import { myListingsResponse, SEEDED_MY_LISTINGS } from '@/test/msw/handlers/my-listings';
import { server } from '@/test/msw/server';
import { renderAppRoute } from '@/test/render';

const [REJECTED, BLOCKED] = SEEDED_MY_LISTINGS;

describe('MyListingsPage', { timeout: 20_000 }, () => {
  it('shows each listing with its status and the reason of a rejection', async () => {
    await renderAppRoute('/account/listings', { auth: signedInAs() });

    const list = await screen.findByRole('navigation', { name: ro.list.label });
    const rejectedRow = within(list).getByRole('link', { name: new RegExp(REJECTED?.title ?? '') });
    expect(within(rejectedRow).getByText(ro.status.rejected)).toBeInTheDocument();
    expect(
      within(rejectedRow).getByText(
        ro.notice.reason.replace('{{message}}', REJECTED?.decisions[0]?.message ?? ''),
      ),
    ).toBeInTheDocument();
    expect(within(rejectedRow).getByText(ro.list.edit)).toBeInTheDocument();

    const blockedRow = within(list).getByRole('link', { name: new RegExp(BLOCKED?.title ?? '') });
    expect(within(blockedRow).getByText(ro.status.blocked)).toBeInTheDocument();
    expect(within(blockedRow).getByText(ro.list.view)).toBeInTheDocument();
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
