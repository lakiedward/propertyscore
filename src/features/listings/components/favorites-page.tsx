import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { LoadMoreButton } from '@/components/layout/load-more-button';
import { PanelPageHeader } from '@/components/layout/panel-page-header';
import { Button } from '@/components/ui/button';
import { favoriteQueries } from '../api/favorites.queries';
import { FavoriteListingCard } from './favorite-listing-card';

const authenticatedRoute = getRouteApi('/_authenticated');

export function FavoritesPage() {
  const { t } = useTranslation(['listings', 'common']);
  const { user } = authenticatedRoute.useRouteContext();
  const favorites = useSuspenseInfiniteQuery(favoriteQueries.list(user.id));
  const items = favorites.data.pages
    .flatMap((page) => page.items)
    .filter(
      (favorite, index, all) =>
        all.findIndex((other) => other.listing_id === favorite.listing_id) === index,
    );
  const total = favorites.data.pages[0]?.total ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <PanelPageHeader
        description={total > 0 ? t('listings:favorites.count', { count: total }) : undefined}
      />
      {items.length > 0 ? (
        <>
          <ul
            aria-label={t('common:panel.account.nav.favorites')}
            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16.25rem),1fr))] gap-4"
          >
            {items.map((favorite) => (
              <li key={favorite.listing_id} className="min-w-0">
                <FavoriteListingCard favorite={favorite} />
              </li>
            ))}
          </ul>
          {favorites.hasNextPage ? (
            <LoadMoreButton
              label={t('listings:explore.list.more')}
              isLoading={favorites.isFetchingNextPage}
              onLoadMore={() => void favorites.fetchNextPage()}
              className="self-center"
            />
          ) : null}
        </>
      ) : (
        <EmptyState
          variant="card"
          kind="empty"
          title={t('listings:favorites.empty.title')}
          description={t('listings:favorites.empty.description')}
          action={
            <Button asChild size="md" className="touch-target">
              <Link to="/listings">{t('listings:favorites.empty.action')}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
