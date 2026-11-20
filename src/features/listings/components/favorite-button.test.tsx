import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/listings.json';
import { signedInAs, signedOut } from '@/test/factories/auth';
import { favoriteIdsResponse } from '@/test/msw/handlers/favorites';
import { postgrestErrorResponse } from '@/test/msw/postgrest-error';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderWithProviders } from '@/test/render';
import { FavoriteButton } from './favorite-button';

const LISTING_ID = 'f2000000-0000-4000-8000-000000000001';
const TITLE = 'Apartament 3 camere, Complex';
const LABEL = ro.favorites.save.replace('{{title}}', TITLE);

async function renderHeart() {
  const view = await renderWithProviders(
    <FavoriteButton listingId={LISTING_ID} title={TITLE} look="overlay" />,
    { auth: signedInAs('user') },
  );
  const heart = await screen.findByRole('button', { name: LABEL });
  await waitFor(() => {
    expect(heart).not.toHaveAttribute('aria-disabled');
  });
  return { ...view, heart };
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
    const { user, heart } = await renderHeart();
    expect(heart).toHaveAttribute('aria-pressed', 'false');

    server.use(favoriteIdsResponse([LISTING_ID]));
    await user.click(heart);

    await waitFor(() => {
      expect(inserted).toEqual({ listing_id: LISTING_ID });
    });
    await waitFor(() => {
      expect(success).toHaveBeenCalledWith(ro.favorites.added);
    });
    expect(screen.getByRole('button', { name: LABEL })).toHaveAttribute('aria-pressed', 'true');
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
    const { user, heart } = await renderHeart();
    expect(heart).toHaveAttribute('aria-pressed', 'true');

    server.use(favoriteIdsResponse([]));
    await user.click(heart);

    await waitFor(() => {
      expect(deletedFilter).toBe(`eq.${LISTING_ID}`);
    });
    await waitFor(() => {
      expect(success).toHaveBeenCalledWith(ro.favorites.removed);
    });
  });

  it('shows the heart pressed at once and puts it back when saving fails', async () => {
    const success = vi.spyOn(toast, 'success');
    let releaseInsert: () => void = () => undefined;
    const insertHeld = new Promise<void>((resolve) => {
      releaseInsert = resolve;
    });
    server.use(
      http.post(supabaseUrl('/rest/v1/favorite_listings'), async () => {
        await insertHeld;
        return postgrestErrorResponse('P0001', 'favorite_limit_reached', 400);
      }),
    );
    const { user, heart } = await renderHeart();

    server.use(
      http.get(supabaseUrl('/rest/v1/favorite_listings'), () =>
        postgrestErrorResponse('XX000', 'boom', 500),
      ),
    );
    await user.click(heart);

    await waitFor(() => {
      expect(heart).toHaveAttribute('aria-pressed', 'true');
    });
    releaseInsert();
    await waitFor(() => {
      expect(heart).toHaveAttribute('aria-pressed', 'false');
    });
    expect(success).not.toHaveBeenCalled();
  });

  it('sends a quick second click only after the first one is done', async () => {
    const requests: string[] = [];
    let releaseInsert: () => void = () => undefined;
    const insertHeld = new Promise<void>((resolve) => {
      releaseInsert = resolve;
    });
    server.use(
      http.post(supabaseUrl('/rest/v1/favorite_listings'), async () => {
        requests.push('insert');
        await insertHeld;
        return new HttpResponse(null, { status: 201 });
      }),
      http.delete(supabaseUrl('/rest/v1/favorite_listings'), () => {
        requests.push('delete');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, heart } = await renderHeart();

    await user.click(heart);
    await user.click(heart);
    await waitFor(() => {
      expect(requests).toEqual(['insert']);
    });
    releaseInsert();

    await waitFor(() => {
      expect(requests).toEqual(['insert', 'delete']);
    });
  });

  it('asks a visitor to sign in and links back to the page', async () => {
    const { user } = await renderWithProviders(
      <FavoriteButton listingId={LISTING_ID} title={TITLE} look="ghost" />,
      { auth: signedOut, path: '/listings/abc?x=1' },
    );

    await user.click(screen.getByRole('button', { name: ro.favorites.signIn.label }));

    expect(await screen.findByText(ro.favorites.signIn.message)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: roCommon.site.header.signIn })).toHaveAttribute(
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
