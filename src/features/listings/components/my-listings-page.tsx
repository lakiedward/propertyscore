import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import { myListingQueries } from '../api/my-listings.queries';
import { MyListingRow } from './my-listing-row';

const authenticatedRoute = getRouteApi('/_authenticated');

export function MyListingsPage() {
  const { t } = useTranslation('myListings');
  const { user } = authenticatedRoute.useRouteContext();
  const { data } = useSuspenseQuery(myListingQueries.list(user.id));
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-h2 leading-heading text-foreground">{t('list.title')}</h1>
          <p className="text-small text-muted-foreground">{t('list.description')}</p>
        </div>
        {data.items.length > 0 ? addListing : null}
      </header>
      {data.items.length > 0 ? (
        <nav
          aria-label={t('list.label')}
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          <ul className="divide-y divide-border-subtle">
            {data.items.map((listing) => (
              <li key={listing.id}>
                <MyListingRow listing={listing} />
              </li>
            ))}
          </ul>
        </nav>
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
