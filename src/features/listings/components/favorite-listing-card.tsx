import { Link } from '@tanstack/react-router';
import { EyeOffIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import { ListingCard } from '@/components/property/listing-card';
import { formatPrice, toCurrency } from '@/i18n/format';
import type { FavoriteListing } from '../api/favorites.api';
import { getListingMediumUrl } from '../api/listings.storage';
import { useCardFacts } from '../hooks/use-card-facts';
import { FavoriteButton } from './favorite-button';
import { ListingPriceLabel } from './listing-price-label';

type FavoriteListingCardProps = {
  favorite: FavoriteListing;
};

export function FavoriteListingCard({ favorite }: FavoriteListingCardProps) {
  const { t } = useTranslation(['listings', 'common']);
  const title = favorite.title ?? t('listings:favorites.unavailableTitle');
  const photoUrl = favorite.photo_path ? getListingMediumUrl(favorite.photo_path) : undefined;
  const cardFacts = useCardFacts();
  const heart = <FavoriteButton listingId={favorite.listing_id} title={title} look="card" />;

  if (!favorite.is_available) {
    return (
      <ListingCard
        layout="stacked"
        photoUrl={photoUrl}
        title={title}
        favorite={heart}
        status={
          <StatusPill
            tone="neutral"
            icon={EyeOffIcon}
            label={t('listings:favorites.unavailable')}
          />
        }
        isDimmed
      />
    );
  }

  const facts = cardFacts(favorite.rooms, favorite.area_m2);

  return (
    <ListingCard
      layout="stacked"
      photoUrl={photoUrl}
      title={
        <Link to="/listings/$listingId" params={{ listingId: favorite.listing_id }}>
          {title}
        </Link>
      }
      price={
        favorite.price !== null && favorite.currency ? (
          <ListingPriceLabel
            price={formatPrice(favorite.price, toCurrency(favorite.currency))}
            isRent={favorite.transaction === 'rent'}
            look="stacked"
          />
        ) : undefined
      }
      facts={facts}
      location={favorite.city ?? undefined}
      favorite={heart}
    />
  );
}
