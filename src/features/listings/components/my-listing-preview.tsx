import { useQuery } from '@tanstack/react-query';
import { EyeIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListingPreviewDialog } from '@/components/property/listing-preview-dialog';
import { ListingSummary } from '@/components/property/listing-summary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { myListingQueries } from '../api/my-listings.queries';
import { useListingPhotoSummary } from '../hooks/use-listing-photo-summary';
import type { MyListing } from '../listing.types';

type MyListingPreviewProps = {
  listingId: string;
  ownerId: string;
};

export function MyListingPreview({ listingId, ownerId }: MyListingPreviewProps) {
  const { t } = useTranslation('myListings');
  const [isOpen, setIsOpen] = useState(false);
  const { data: listing } = useQuery({
    ...myListingQueries.detail(listingId, ownerId),
    enabled: isOpen,
  });

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        <EyeIcon aria-hidden />
        {t('list.preview')}
      </Button>
      <ListingPreviewDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={t('list.previewTitle')}
        description={t('list.previewDescription')}
      >
        {listing ? (
          <PreviewContent listing={listing} />
        ) : (
          <div className="flex flex-col gap-3 p-5.5">
            <Skeleton className="aspect-4/3 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        )}
      </ListingPreviewDialog>
    </>
  );
}

function PreviewContent({ listing }: { listing: MyListing }) {
  const summary = useListingPhotoSummary(listing);
  return <ListingSummary content={summary} />;
}
