import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/listings.json';
import { signedInAs } from '@/test/factories/auth';
import {
  buildFavoriteListing,
  buildUnavailableFavoriteListing,
} from '@/test/factories/favorite-listing';
import { favoriteIdsResponse, favoriteListResponse } from '@/test/msw/handlers/favorites';
import { postgrestErrorResponse } from '@/test/msw/postgrest-error';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';
import { FAVORITES_PAGE_SIZE } from '../api/favorites.api';

const SALE = buildFavoriteListing({ title: 'Apartament 3 camere, Complex', price: 142000 });
const RENT = buildFavoriteListing({
  title: 'Apartament 2 camere, Fabric',
  transaction: 'rent',
  price: 450,
  rooms: 2,
  area_m2: 54,
});
const GONE = buildUnavailableFavoriteListing({ title: 'Casă 4 camere, Elisabetin' });
const BLOCKED = buildUnavailableFavoriteListing({ title: null, photo_path: null });

const LIST_NAME = roCommon.panel.account.nav.favorites;
const LOAD_MORE = ro.explore.list.more;

function withCount(template: string, count: number) {
  return template.replace('{{count}}', String(count));
}

function heartLabel(title: string) {
  return ro.favorites.save.replace('{{title}}', title);
}

function factsOf(rooms: number, area: number) {
  return [
    withCount(roCommon.listingSummary.facts.rooms_few, rooms),
    roCommon.listingSummary.area.replace('{{value}}', String(area)),
  ].join(' · ');
}

function cardOf(title: string) {
  return screen.getByRole('article', { name: title });
}

describe('FavoritesPage', { timeout: 20_000 }, () => {
  it('shows the saved listings, the count and listings that are no longer public', async () => {
    server.use(
      favoriteListResponse([SALE, RENT, GONE, BLOCKED]),
      favoriteIdsResponse([SALE.listing_id, RENT.listing_id, GONE.listing_id, BLOCKED.listing_id]),
    );
    await renderAppRoute('/account/favorites', { auth: signedInAs() });

    expect(await screen.findByRole('heading', { level: 1, name: LIST_NAME })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText(withCount(ro.favorites.count_few, 4))).toBeInTheDocument();

    const sale = cardOf(SALE.title ?? '');
    expect(within(sale).getByRole('heading', { level: 2 })).toHaveTextContent(SALE.title ?? '');
    expect(within(sale).getByRole('link', { name: SALE.title ?? '' })).toHaveAttribute(
      'href',
      `/listings/${SALE.listing_id}`,
    );
    expect(within(sale).getByText('142.000 €')).toBeInTheDocument();
    expect(within(sale).getByText(factsOf(3, 76))).toBeInTheDocument();
    expect(within(sale).getByText('Timișoara')).toBeInTheDocument();

    const rent = cardOf(RENT.title ?? '');
    expect(within(rent).getByText(ro.explore.perMonthSuffix)).toBeInTheDocument();

    const gone = cardOf(GONE.title ?? '');
    expect(within(gone).getByText(ro.favorites.unavailable)).toBeInTheDocument();
    expect(within(gone).queryByRole('link')).not.toBeInTheDocument();
    expect(
      await within(gone).findByRole('button', { name: heartLabel(GONE.title ?? '') }),
    ).toHaveAttribute('aria-pressed', 'true');

    const blocked = cardOf(ro.favorites.unavailableTitle);
    expect(within(blocked).getByText(ro.favorites.unavailable)).toBeInTheDocument();
  });

  it('drops a listing from the page as soon as its heart is pressed', async () => {
    let releaseDelete: () => void = () => undefined;
    const deleteHeld = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });
    server.use(
      favoriteListResponse([SALE, RENT]),
      favoriteIdsResponse([SALE.listing_id, RENT.listing_id]),
      http.delete(supabaseUrl('/rest/v1/favorite_listings'), async () => {
        await deleteHeld;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderAppRoute('/account/favorites', { auth: signedInAs() });

    const heart = await within(cardOf(SALE.title ?? '')).findByRole('button', {
      name: heartLabel(SALE.title ?? ''),
    });
    await waitFor(() => {
      expect(heart).toHaveAttribute('aria-pressed', 'true');
    });
    await user.click(heart);

    await waitFor(() => {
      expect(screen.queryByRole('article', { name: SALE.title ?? '' })).not.toBeInTheDocument();
    });
    expect(screen.getByText(withCount(ro.favorites.count_one, 1))).toBeInTheDocument();
    releaseDelete();
  });

  it('shows the empty state with a way to the listings', async () => {
    await renderAppRoute('/account/favorites', { auth: signedInAs() });

    expect(await screen.findByText(ro.favorites.empty.title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: ro.favorites.empty.action })).toHaveAttribute(
      'href',
      '/listings',
    );
  });

  it('loads more saved listings on request and waits on the button meanwhile', async () => {
    const many = Array.from({ length: FAVORITES_PAGE_SIZE + 1 }, (_, index) =>
      buildFavoriteListing({ title: `Locuința ${String(index + 1)}` }),
    );
    server.use(favoriteListResponse(many));
    const { user } = await renderAppRoute('/account/favorites', { auth: signedInAs() });

    const list = await screen.findByRole('list', { name: LIST_NAME });
    expect(within(list).getAllByRole('listitem')).toHaveLength(FAVORITES_PAGE_SIZE);

    let releasePage: () => void = () => undefined;
    const pageHeld = new Promise<void>((resolve) => {
      releasePage = resolve;
    });
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/list_my_favorite_listings'), async () => {
        await pageHeld;
        const last = many.at(-1);
        return HttpResponse.json(last ? [{ ...last, total_count: many.length }] : []);
      }),
    );
    await user.click(screen.getByRole('button', { name: LOAD_MORE }));

    const button = screen.getByRole('button', { name: LOAD_MORE });
    await waitFor(() => {
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
    expect(button).toBeDisabled();
    releasePage();

    await waitFor(() => {
      expect(within(list).getAllByRole('listitem')).toHaveLength(FAVORITES_PAGE_SIZE + 1);
    });
    expect(screen.queryByRole('button', { name: LOAD_MORE })).not.toBeInTheDocument();
  });

  it('shows the route error when the list cannot be loaded', async () => {
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/list_my_favorite_listings'), () =>
        postgrestErrorResponse('XX000', 'boom', 500),
      ),
    );
    await renderAppRoute('/account/favorites', { auth: signedInAs() });

    expect(await screen.findByRole('button', { name: roCommon.actions.retry })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: LIST_NAME })).not.toBeInTheDocument();
  });
});
