import { useListingSummary } from '@/hooks/use-listing-summary';
import { getListingMediumUrl, getListingPhotoUrl } from '../api/listings.storage';

type SummaryListing = Parameters<typeof useListingSummary>[0] & {
  photos: readonly { id: string; path: string }[];
};

export function useListingPhotoSummary(listing: SummaryListing) {
  return useListingSummary(
    listing,
    listing.photos.map((photo) => ({
      id: photo.id,
      src: getListingPhotoUrl(photo.path),
      smallSrc: getListingMediumUrl(photo.path),
    })),
  );
}
