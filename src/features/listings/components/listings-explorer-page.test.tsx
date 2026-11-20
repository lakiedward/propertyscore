import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roCommon from '@/i18n/locales/ro/common.json';
import roListings from '@/i18n/locales/ro/listings.json';
import { mapCanvasStubControl } from '@/test/mocks/map-canvas-control';
import { listingsResponse, seededListing } from '@/test/msw/handlers/listings';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

const explore = roListings.explore;

function withCount(template: string, count: number) {
  return template.replace('{{count}}', String(count));
}

async function findCards() {
  return screen.findByRole('list', { name: explore.list.label });
}

function tilePinOf(title: string) {
  const listing = seededListing(title);
  return {
    id: listing.id,
    position: [listing.longitude, listing.latitude] satisfies [number, number],
    price: listing.price,
    currency: listing.currency,
  };
}

describe('ListingsExplorerPage', { timeout: 20_000 }, () => {
  afterEach(() => {
    mapCanvasStubControl.tilePins = [];
    mapCanvasStubControl.shouldFail = false;
  });

  it('shows the total from the map summary and the listings of the map area below it', async () => {
    await renderAppRoute('/listings');

    expect(
      await screen.findByRole('heading', { level: 1, name: explore.title.sale }),
    ).toBeInTheDocument();
    const cards = await findCards();
    expect(within(cards).getAllByRole('button', { name: explore.list.showOnMap })).toHaveLength(2);
    expect(
      screen.getByRole('heading', { level: 2, name: withCount(explore.list.inView_few, 2) }),
    ).toBeInTheDocument();
    expect(await screen.findByText(withCount(explore.shown_few, 2))).toBeInTheDocument();
  });

  it('opens at the top of the page, with the map first', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo');
    scrollTo.mockClear();

    await renderAppRoute('/listings');

    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    });
    scrollTo.mockRestore();
  });

  it('opens a home picked on the map with its details and closes it again', async () => {
    mapCanvasStubControl.tilePins = [tilePinOf('Apartament cu 3 camere')];
    const { user } = await renderAppRoute('/listings');

    const map = await screen.findByRole('region', { name: explore.mapLabel });
    await user.click(await within(map).findByRole('button', { name: /125/ }));

    expect(await within(map).findByRole('link', { name: explore.popup.viewListing })).toBeVisible();
    expect(within(map).getByText('Apartament cu 3 camere')).toBeInTheDocument();

    await user.click(within(map).getByRole('button', { name: roCommon.actions.close }));

    expect(
      within(map).queryByRole('link', { name: explore.popup.viewListing }),
    ).not.toBeInTheDocument();
  });

  it('lists every listing when the map area is not used', async () => {
    const { user } = await renderAppRoute('/listings');

    await findCards();
    await user.click(screen.getByRole('checkbox', { name: explore.list.onlyInView }));

    expect(
      await screen.findByRole('heading', { level: 2, name: withCount(explore.list.all_few, 2) }),
    ).toBeInTheDocument();
  });

  it('switches to listings for rent and keeps the choice in the address', async () => {
    const { user, router } = await renderAppRoute('/listings');

    await user.click(await screen.findByRole('radio', { name: roListings.transaction.rent }));

    await waitFor(() => {
      expect(router.state.location.search).toEqual({ transaction: 'rent' });
    });
    expect(
      await screen.findByRole('heading', { level: 2, name: withCount(explore.list.inView_one, 1) }),
    ).toBeInTheDocument();
  });

  it('keeps only the homes up to the maximum price from the address', async () => {
    await renderAppRoute('/listings?price=100000');

    expect(await screen.findByText(withCount(explore.shown_one, 1))).toBeInTheDocument();
    const cards = await findCards();
    await waitFor(() => {
      expect(within(cards).getAllByRole('button', { name: explore.list.showOnMap })).toHaveLength(
        1,
      );
    });
    expect(screen.getByRole('button', { name: explore.filters.reset })).toBeInTheDocument();
  });

  it('says when there is no listing at all for the chosen transaction', async () => {
    server.use(
      http.get(supabaseUrl('/rest/v1/listings'), () => listingsResponse([])),
      http.post(supabaseUrl('/rest/v1/rpc/listing_map_summary'), () => HttpResponse.json([])),
    );
    await renderAppRoute('/listings');

    expect(await screen.findByText(explore.empty.none.sale)).toBeInTheDocument();
  });

  it('opens the map on the whole screen and goes back to the list', async () => {
    const { user } = await renderAppRoute('/listings');

    await user.click(await screen.findByRole('button', { name: explore.showMap }));

    expect(screen.getByRole('button', { name: explore.showList })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: explore.controls.exitFullScreen })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('explains when the map cannot be drawn and still lists every listing', async () => {
    mapCanvasStubControl.shouldFail = true;
    await renderAppRoute('/listings');

    expect(await screen.findByText(explore.mapError)).toBeInTheDocument();
    const cards = await findCards();
    expect(within(cards).getAllByRole('button', { name: explore.list.showOnMap })).toHaveLength(2);
  });
});
