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

function cardOf(title: string) {
  return screen.getByRole('article', { name: title });
}

describe('FavoritesPage', { timeout: 20_000 }, () => {
  it('shows the saved listings, the count and a listing that is no longer public', async () => {
    server.use(
      favoriteListResponse([SALE, RENT, GONE]),
      favoriteIdsResponse([SALE.listing_id, RENT.listing_id, GONE.listing_id]),
    );
    await renderAppRoute('/account/favorites', { auth: signedInAs() });

    expect(
      await screen.findByRole('heading', { level: 1, name: ro.favorites.title }),
    ).toBeVisible();
    expect(screen.getByText(ro.favorites.eyebrow)).toBeInTheDocument();
    expect(screen.getByText('3 locuințe salvate')).toBeInTheDocument();

    const sale = cardOf(SALE.title);
    expect(within(sale).getByRole('link', { name: SALE.title })).toHaveAttribute(
      'href',
      `/listings/${SALE.listing_id}`,
    );
    expect(within(sale).getByText('142.000 €')).toBeInTheDocument();
    expect(within(sale).getByText('3 camere · 76 m²')).toBeInTheDocument();
    expect(within(sale).getByText('Timișoara')).toBeInTheDocument();

    const rent = cardOf(RENT.title);
    expect(within(rent).getByText(ro.explore.perMonthSuffix)).toBeInTheDocument();

    const gone = cardOf(GONE.title);
    expect(within(gone).getByText(ro.favorites.unavailable)).toBeInTheDocument();
    expect(within(gone).queryByRole('link')).not.toBeInTheDocument();
    expect(
      await within(gone).findByRole('button', {
        name: ro.favorites.remove.replace('{{title}}', GONE.title),
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('drops a listing from the page when its heart is pressed', async () => {
    server.use(
      favoriteListResponse([SALE, RENT]),
      favoriteIdsResponse([SALE.listing_id, RENT.listing_id]),
    );
    const { user } = await renderAppRoute('/account/favorites', { auth: signedInAs() });

    const heart = await within(cardOf(SALE.title)).findByRole('button', {
      name: ro.favorites.remove.replace('{{title}}', SALE.title),
    });
    await waitFor(() => {
      expect(heart).toBeEnabled();
    });
    server.use(favoriteListResponse([RENT]), favoriteIdsResponse([RENT.listing_id]));
    await user.click(heart);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: SALE.title })).not.toBeInTheDocument();
    });
    expect(screen.getByText('1 locuință salvată')).toBeInTheDocument();
  });

  it('shows the empty state with a way to the listings', async () => {
    await renderAppRoute('/account/favorites', { auth: signedInAs() });

    expect(await screen.findByText(ro.favorites.empty.title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: ro.favorites.empty.action })).toHaveAttribute(
      'href',
      '/listings',
    );
  });

  it('loads more saved listings on request', async () => {
    const many = Array.from({ length: FAVORITES_PAGE_SIZE + 1 }, (_, index) =>
      buildFavoriteListing({ title: `Locuința ${String(index + 1)}` }),
    );
    server.use(favoriteListResponse(many));
    const { user } = await renderAppRoute('/account/favorites', { auth: signedInAs() });

    const list = await screen.findByRole('list', { name: ro.favorites.title });
    expect(within(list).getAllByRole('listitem')).toHaveLength(FAVORITES_PAGE_SIZE);

    await user.click(screen.getByRole('button', { name: ro.favorites.loadMore }));

    await waitFor(() => {
      expect(within(list).getAllByRole('listitem')).toHaveLength(FAVORITES_PAGE_SIZE + 1);
    });
    expect(screen.queryByRole('button', { name: ro.favorites.loadMore })).not.toBeInTheDocument();
  });

  it('shows the route error when the list cannot be loaded', async () => {
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/list_my_favorite_listings'), () =>
        HttpResponse.json(
          { code: 'XX000', message: 'boom', details: null, hint: null },
          { status: 500 },
        ),
      ),
    );
    await renderAppRoute('/account/favorites', { auth: signedInAs() });

    expect(await screen.findByRole('button', { name: roCommon.actions.retry })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: ro.favorites.title })).not.toBeInTheDocument();
  });
});
