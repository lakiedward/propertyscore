import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { PanelPageHeader } from '@/components/layout/panel-page-header';
import { Button } from '@/components/ui/button';
import { myListingQueries } from '../api/my-listings.queries';
import { MyListingCard } from './my-listing-card';

const authenticatedRoute = getRouteApi('/_authenticated');

export function MyListingsPage() {
  const { t } = useTranslation('myListings');
  const { user } = authenticatedRoute.useRouteContext();
  const listings = useSuspenseInfiniteQuery(myListingQueries.list(user.id));
  const items = listings.data.pages.flatMap((page) => page.items);
  const addListing = (
    <Button asChild size="md">
      <Link to="/account/listings/new">
        <PlusIcon aria-hidden />
        {t('list.add')}
      </Link>
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <PanelPageHeader
        eyebrow={t('list.eyebrow')}
        title={t('list.title')}
        actions={items.length > 0 ? addListing : null}
      />
      {items.length > 0 ? (
        <>
          <ul aria-label={t('list.label')} className="flex flex-col gap-3.5">
            {items.map((listing) => (
              <li key={listing.id}>
                <MyListingCard listing={listing} />
              </li>
            ))}
          </ul>
          {listings.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              className="self-center"
              disabled={listings.isFetchingNextPage}
              aria-busy={listings.isFetchingNextPage}
              onClick={() => void listings.fetchNextPage()}
            >
              {t('list.more')}
            </Button>
          ) : null}
        </>
      ) : (
        <EmptyState
          kind="empty"
          title={t('list.empty.title')}
          description={t('list.empty.description')}
          action={addListing}
        />
      )}
    </div>
  );
}
