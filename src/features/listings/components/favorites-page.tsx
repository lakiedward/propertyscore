import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { PanelPageHeader } from '@/components/layout/panel-page-header';
import { Button } from '@/components/ui/button';
import { favoriteQueries } from '../api/favorites.queries';
import { FavoriteListingCard } from './favorite-listing-card';

const authenticatedRoute = getRouteApi('/_authenticated');

export function FavoritesPage() {
  const { t } = useTranslation('listings');
  const { user } = authenticatedRoute.useRouteContext();
  const favorites = useSuspenseInfiniteQuery(favoriteQueries.list(user.id));
  const items = favorites.data.pages.flatMap((page) => page.items);
  const total = favorites.data.pages[0]?.total ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <PanelPageHeader
        eyebrow={t('favorites.eyebrow')}
        title={t('favorites.title')}
        description={total > 0 ? t('favorites.count', { count: total }) : undefined}
      />
      {items.length > 0 ? (
        <>
          <ul
            aria-label={t('favorites.title')}
            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16.25rem),1fr))] gap-4"
          >
            {items.map((favorite) => (
              <li key={favorite.listing_id} className="min-w-0">
                <FavoriteListingCard favorite={favorite} />
              </li>
            ))}
          </ul>
          {favorites.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              className="self-center"
              disabled={favorites.isFetchingNextPage}
              aria-busy={favorites.isFetchingNextPage}
              onClick={() => void favorites.fetchNextPage()}
            >
              {t('favorites.loadMore')}
            </Button>
          ) : null}
        </>
      ) : (
        <EmptyState
          kind="empty"
          title={t('favorites.empty.title')}
          description={t('favorites.empty.description')}
          action={
            <Button asChild size="md">
              <Link to="/listings">{t('favorites.empty.action')}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
