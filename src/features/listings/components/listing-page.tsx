import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, MapPinIcon, Share2Icon } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import { PhotoMosaic } from '@/components/media/photo-mosaic';
import { FactChip } from '@/components/property/fact-chip';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/i18n/format';
import { listingQueries } from '../api/listings.queries';
import { useListingPhotoSummary } from '../hooks/use-listing-photo-summary';
import { listingPhotos } from '../listing.utils';

const LISTING_MAP_ZOOM = 15;
const LISTING_MARKER_ID = 'listing';

type ListingPageProps = {
  listingId: string;
};

export function ListingPage({ listingId }: ListingPageProps) {
  const { t } = useTranslation('listings');
  const { data: listing } = useSuspenseQuery(listingQueries.detail(listingId));
  const summary = useListingPhotoSummary({ ...listing, photos: listingPhotos(listing) });
  const position: [number, number] = [listing.longitude, listing.latitude];
  const address = t('explore.address', { street: listing.street_label, city: listing.city });

  const handleShare = async () => {
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: listing.title, url });
      } catch {
        return;
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('detail.share.copied'));
    } catch {
      toast.error(t('detail.share.copyFailed'));
    }
  };

  return (
    <div className="page-wrap flex flex-col gap-6 pt-6 pb-section">
      <Link
        to="/listings"
        search={listing.transaction === 'sale' ? {} : { transaction: listing.transaction }}
        className="touch-target inline-flex w-fit items-center gap-2 rounded-md text-small font-bold text-brand hover:text-link-hover focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        {t(`detail.back.${listing.transaction}`)}
      </Link>

      <div className="overflow-hidden rounded-xl border border-card bg-card shadow-card-soft">
        <PhotoMosaic
          photos={summary.photos}
          moreLabel={summary.moreLabel}
          emptyLabel={summary.emptyLabel}
          className="lg:aspect-5/2"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <header className="flex flex-col gap-4 rounded-lg border border-card bg-card p-5 shadow-card-soft sm:p-6 lg:col-start-1">
          <p className="text-eyebrow text-muted-foreground uppercase">{summary.eyebrow}</p>
          <h1 className="text-h2 text-foreground">{listing.title}</h1>
          <p className="flex items-start gap-1.5 text-body text-muted-foreground">
            <MapPinIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            {address}
          </p>
          <ul className="flex flex-wrap gap-2" aria-label={t('detail.factsLabel')}>
            {summary.facts.map((fact) => (
              <li key={fact.key}>
                <FactChip icon={fact.icon} label={fact.label} />
              </li>
            ))}
          </ul>
        </header>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <section
            aria-label={t('detail.priceLabel')}
            className="flex flex-col gap-4 rounded-lg border border-card bg-card p-5 shadow-card-soft"
          >
            <div className="flex flex-col gap-1">
              <p className="text-eyebrow text-muted-foreground uppercase">
                {t(`detail.priceEyebrow.${listing.transaction}`)}
              </p>
              <p className="text-price-lg text-brand tabular-nums">{summary.price}</p>
            </div>
            {listing.published_at ? (
              <p className="border-t border-border-subtle pt-3 text-caption text-muted-foreground">
                {t('detail.publishedAt', {
                  date: formatDate(listing.published_at, { dateStyle: 'long' }),
                })}
              </p>
            ) : null}
            <Button type="button" variant="outline" onClick={() => void handleShare()}>
              <Share2Icon aria-hidden />
              {t('detail.share.action')}
            </Button>
          </section>
        </aside>

        <div className="flex flex-col gap-6 lg:col-start-1">
          {summary.description ? (
            <ListingSection title={t('detail.description')}>
              <p className="max-w-copy text-body leading-copy whitespace-pre-line text-foreground">
                {summary.description}
              </p>
            </ListingSection>
          ) : null}

          {summary.details.length > 0 ? (
            <ListingSection title={summary.detailsHeading}>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                {summary.details.map((detail) => (
                  <div
                    key={detail.key}
                    className="flex flex-col gap-0.5 border-b border-border-subtle pb-3"
                  >
                    <dt className="text-meta text-muted-foreground">{detail.label}</dt>
                    <dd className="text-body-sm font-semibold text-foreground">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </ListingSection>
          ) : null}

          <ListingSection title={t('detail.location.title')}>
            <p className="text-small text-muted-foreground">{address}</p>
            <LazyMapCanvas
              label={t('detail.location.mapLabel')}
              center={position}
              zoom={LISTING_MAP_ZOOM}
              markers={[
                {
                  id: LISTING_MARKER_ID,
                  position,
                  node: (
                    <MapPinIcon aria-hidden className="size-8 fill-cta text-brand drop-shadow-md" />
                  ),
                },
              ]}
              errorFallback={
                <p className="p-4 text-small text-muted-foreground">
                  {t('detail.location.mapError')}
                </p>
              }
              className="h-72 rounded-xl sm:h-96"
              fallbackClassName="h-72 rounded-xl sm:h-96"
            />
            <p className="text-meta text-muted-foreground">{t('detail.location.note')}</p>
          </ListingSection>
        </div>
      </div>
    </div>
  );
}

type ListingSectionProps = {
  title: string;
  children: ReactNode;
};

function ListingSection({ title, children }: ListingSectionProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-lg border border-card bg-card p-5 shadow-card-soft sm:p-6"
    >
      <h2 id={headingId} className="text-h4 text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
