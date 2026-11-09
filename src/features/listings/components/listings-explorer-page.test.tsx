import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import roListings from '@/i18n/locales/ro/listings.json';
import { listingsResponse } from '@/test/msw/handlers/listings';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const explore = roListings.explore;

function withCount(template: string, count: number) {
  return template.replace('{{count}}', String(count));
}

describe('ListingsExplorerPage', { timeout: 20_000 }, () => {
  it('shows every approved listing as a pin and the listings of the area as cards', async () => {
    const { user } = await renderAppRoute('/listings');

    expect(await screen.findByRole('heading', { level: 1, name: explore.title })).toBeVisible();
    const cards = await screen.findByRole('list', { name: explore.listLabel });
    expect(within(cards).getAllByRole('button')).toHaveLength(2);
    expect(screen.getByText(withCount(explore.count.sale_few, 2))).toBeInTheDocument();

    const map = await screen.findByRole('region', { name: explore.mapLabel, hidden: true });
    const [, secondPin] = within(map).getAllByRole('button', { hidden: true });
    expect(within(map).getAllByRole('button', { hidden: true })).toHaveLength(2);
    if (!secondPin) {
      throw new Error('The second pin is missing');
    }

    await user.click(secondPin);

    expect(secondPin).toHaveAttribute('aria-pressed', 'true');
    expect(within(cards).getAllByRole('button')[1]).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches to listings for rent and keeps the choice in the address', async () => {
    const { user, router } = await renderAppRoute('/listings');

    await user.click(await screen.findByRole('radio', { name: roListings.transaction.rent }));

    await waitFor(() => {
      expect(router.state.location.search).toEqual({ transaction: 'rent' });
    });
    expect(await screen.findByText(withCount(explore.count.rent_one, 1))).toBeInTheDocument();
  });

  it('says when there is no listing at all for the chosen transaction', async () => {
    server.use(http.get(supabaseUrl('/rest/v1/listings'), () => listingsResponse([])));
    await renderAppRoute('/listings');

    expect(await screen.findByText(explore.emptyNone.sale)).toBeInTheDocument();
  });

  it('switches between the list and the map on a phone', async () => {
    const { user } = await renderAppRoute('/listings');

    await user.click(await screen.findByRole('button', { name: explore.showMap }));

    expect(screen.getByRole('button', { name: explore.showList })).toBeInTheDocument();
  });
});
