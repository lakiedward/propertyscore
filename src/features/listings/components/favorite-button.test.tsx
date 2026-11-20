import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import ro from '@/i18n/locales/ro/listings.json';
import { signedInAs, signedOut } from '@/test/factories/auth';
import { favoriteIdsResponse } from '@/test/msw/handlers/favorites';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { FavoriteButton } from './favorite-button';

const LISTING_ID = 'f2000000-0000-4000-8000-000000000001';
const TITLE = 'Apartament 3 camere, Complex';

function interpolate(template: string) {
  return template.replace('{{title}}', TITLE);
}

describe('FavoriteButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves a listing and tells the user', async () => {
    const success = vi.spyOn(toast, 'success');
    let inserted: unknown;
    server.use(
      http.post(supabaseUrl('/rest/v1/favorite_listings'), async ({ request }) => {
        inserted = await request.json();
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const { user } = await renderWithProviders(
      <FavoriteButton listingId={LISTING_ID} title={TITLE} look="overlay" />,
      { auth: signedInAs('user') },
    );

    const heart = await screen.findByRole('button', { name: interpolate(ro.favorites.add) });
    await waitFor(() => {
      expect(heart).toBeEnabled();
    });
    expect(heart).toHaveAttribute('aria-pressed', 'false');

    server.use(favoriteIdsResponse([LISTING_ID]));
    await user.click(heart);

    expect(inserted).toEqual({ listing_id: LISTING_ID });
    await waitFor(() => {
      expect(success).toHaveBeenCalledWith(ro.favorites.added);
    });
    expect(
      await screen.findByRole('button', { name: interpolate(ro.favorites.remove) }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('removes a saved listing', async () => {
    const success = vi.spyOn(toast, 'success');
    let deletedFilter: string | null = null;
    server.use(
      favoriteIdsResponse([LISTING_ID]),
      http.delete(supabaseUrl('/rest/v1/favorite_listings'), ({ request }) => {
        deletedFilter = new URL(request.url).searchParams.get('listing_id');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderWithProviders(
      <FavoriteButton listingId={LISTING_ID} title={TITLE} look="card" />,
      { auth: signedInAs('user') },
    );

    const heart = await screen.findByRole('button', { name: interpolate(ro.favorites.remove) });
    server.use(favoriteIdsResponse([]));
    await user.click(heart);

    expect(deletedFilter).toBe(`eq.${LISTING_ID}`);
    await waitFor(() => {
      expect(success).toHaveBeenCalledWith(ro.favorites.removed);
    });
  });

  it('puts the heart back when saving fails', async () => {
    const success = vi.spyOn(toast, 'success');
    server.use(
      http.post(supabaseUrl('/rest/v1/favorite_listings'), () =>
        HttpResponse.json(
          { code: 'P0001', message: 'favorite_limit_reached', details: null, hint: null },
          { status: 400 },
        ),
      ),
    );
    const { user } = await renderWithProviders(
      <FavoriteButton listingId={LISTING_ID} title={TITLE} look="overlay" />,
      { auth: signedInAs('user') },
    );

    const heart = await screen.findByRole('button', { name: interpolate(ro.favorites.add) });
    await waitFor(() => {
      expect(heart).toBeEnabled();
    });
    await user.click(heart);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: interpolate(ro.favorites.add) })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });
    expect(success).not.toHaveBeenCalled();
  });

  it('asks a visitor to sign in and links back to the page', async () => {
    const { user } = await renderWithProviders(
      <FavoriteButton listingId={LISTING_ID} title={TITLE} look="ghost" />,
      { auth: signedOut, path: '/listings/abc?x=1' },
    );

    await user.click(screen.getByRole('button', { name: ro.favorites.signIn.label }));

    expect(await screen.findByText(ro.favorites.signIn.message)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: ro.favorites.signIn.action })).toHaveAttribute(
      'href',
      `/login?redirect=${encodeURIComponent('/listings/abc?x=1')}`,
    );
  });

  it('is hidden for admins', async () => {
    await renderWithProviders(
      <FavoriteButton listingId={LISTING_ID} title={TITLE} look="overlay" />,
      { auth: signedInAs('admin') },
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
