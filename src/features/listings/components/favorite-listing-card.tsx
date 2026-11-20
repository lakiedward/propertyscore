import { Link } from '@tanstack/react-router';
import { EyeOffIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import { ListingCard } from '@/components/property/listing-card';
import { formatNumber, formatPrice, toCurrency } from '@/i18n/format';
import type { FavoriteListing } from '../api/favorites.api';
import { getListingMediumUrl } from '../api/listings.storage';
import { FavoriteButton } from './favorite-button';

type FavoriteListingCardProps = {
  favorite: FavoriteListing;
};

export function FavoriteListingCard({ favorite }: FavoriteListingCardProps) {
  const { t } = useTranslation('listings');
  const photoUrl = favorite.photo_path ? getListingMediumUrl(favorite.photo_path) : undefined;
  const heart = (
    <FavoriteButton listingId={favorite.listing_id} title={favorite.title} look="card" />
  );

  if (!favorite.is_available) {
    return (
      <ListingCard
        layout="stacked"
        photoUrl={photoUrl}
        title={favorite.title}
        favorite={heart}
        status={<StatusPill tone="neutral" icon={EyeOffIcon} label={t('favorites.unavailable')} />}
        isDimmed
      />
    );
  }

  const price =
    favorite.price !== null && favorite.currency
      ? formatPrice(favorite.price, toCurrency(favorite.currency))
      : undefined;
  const facts =
    favorite.rooms !== null && favorite.area_m2 !== null
      ? t('favorites.facts', { count: favorite.rooms, area: formatNumber(favorite.area_m2) })
      : undefined;

  return (
    <ListingCard
      layout="stacked"
      photoUrl={photoUrl}
      title={
        <Link to="/listings/$listingId" params={{ listingId: favorite.listing_id }}>
          {favorite.title}
        </Link>
      }
      price={
        price ? (
          <span className="text-price-sm text-foreground tabular-nums">
            {price}
            {favorite.transaction === 'rent' ? (
              <small className="ml-1 text-small font-semibold tracking-normal text-muted-foreground">
                {t('explore.perMonthSuffix')}
              </small>
            ) : null}
          </span>
        ) : undefined
      }
      facts={facts}
      location={favorite.city ?? undefined}
      favorite={heart}
    />
  );
}
