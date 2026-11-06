import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ListingSummary } from '@/components/property/listing-summary';
import { useListingPhotoSummary } from '../hooks/use-listing-photo-summary';
import type { MyListing } from '../listing.types';
import { ListingContactCard } from './listing-contact-card';

type ListingOverviewProps = {
  listing: MyListing;
  ownerId: string;
  email: string | undefined;
};

export function ListingOverview({ listing, ownerId, email }: ListingOverviewProps) {
  const { t } = useTranslation('myListings');
  const summary = useListingPhotoSummary(listing);
  const previewId = useId();
  const contactId = useId();

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <section
        aria-labelledby={previewId}
        className="overflow-hidden rounded-lg border border-border bg-card pb-5.5"
      >
        <p
          id={previewId}
          className="border-b border-border-subtle bg-background px-4 py-2.5 text-meta font-bold text-muted-foreground"
        >
          {t('overview.previewLabel')}
        </p>
        <ListingSummary content={summary} />
      </section>
      <section
        aria-labelledby={contactId}
        className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4.5"
      >
        <h2 id={contactId} className="text-body font-bold text-foreground">
          {t('overview.contactTitle')}
        </h2>
        <ListingContactCard ownerId={ownerId} email={email} />
      </section>
    </div>
  );
}
