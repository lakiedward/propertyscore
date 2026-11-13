import { Link, useNavigate } from '@tanstack/react-router';
import { ExternalLinkIcon, ImageOffIcon, PencilIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import { Button } from '@/components/ui/button';
import { useListingPrice } from '@/hooks/use-listing-price';
import { cn } from '@/lib/utils';
import { getListingMediumUrl, getListingPhotoUrl } from '../api/listings.storage';
import { useStartListingRevision } from '../api/my-listings.queries';
import { isEditableStatus, OWNER_STATUS_META, type ListingStatus } from '../listing-status';
import type { MyListingRow } from '../listing.types';

type MyListingCardProps = {
  listing: MyListingRow;
};

const reasonBoxClass = {
  rejected: 'bg-warning-surface text-warning',
  blocked: 'bg-error-surface text-destructive',
} as const;

type RevisionNote = 'draft' | 'pending_approval' | 'rejected';

function revisionNote(status: ListingStatus): RevisionNote | null {
  return status === 'draft' || status === 'pending_approval' || status === 'rejected'
    ? status
    : null;
}

type Translate = ReturnType<typeof useTranslation<['myListings', 'common']>>['t'];

function floorShort(floor: number | null, total: number | null, t: Translate): string | null {
  if (floor === null) {
    return null;
  }
  if (floor === 0) {
    return t('list.groundFloorShort');
  }
  return total === null
    ? t('list.floorOnlyShort', { floor })
    : t('list.floorShort', { floor, total });
}

export function MyListingCard({ listing }: MyListingCardProps) {
  const { t } = useTranslation(['myListings', 'common']);
  const { price, area } = useListingPrice(listing);
  const titleId = useId();
  const meta = OWNER_STATUS_META[listing.status];
  const [decision] = listing.decisions;
  const navigate = useNavigate();
  const startRevision = useStartListingRevision();
  const isEditable = isEditableStatus(listing.status);
  const isApproved = listing.status === 'approved';
  const { revision } = listing;
  const [revisionDecision] = revision?.decisions ?? [];
  const note = revision ? revisionNote(revision.status) : null;
  const canEditApproved = isApproved && revision?.status !== 'pending_approval';

  const openRevision = (revisionId: string) =>
    navigate({ to: '/account/listings/$listingId', params: { listingId: revisionId } });

  const handleEditApproved = () => {
    if (revision) {
      void openRevision(revision.id);
      return;
    }
    startRevision.mutate(listing.id, {
      onSuccess: (revisionId) => {
        void openRevision(revisionId);
      },
    });
  };
  const reasonStatus =
    listing.status === 'rejected' || listing.status === 'blocked' ? listing.status : null;
  const facts = [
    t(`common:listingDetails.propertyType.${listing.property_type}`),
    area,
    t('common:listingSummary.facts.rooms', { count: listing.rooms }),
    floorShort(listing.floor, listing.building_floors, t),
  ].filter((fact): fact is string => fact !== null);

  return (
    <article
      aria-labelledby={titleId}
      className="grid overflow-hidden rounded-xl border border-border-hairline bg-card shadow-card-soft sm:grid-cols-[minmax(0,340px)_minmax(0,1fr)]"
    >
      <CoverPhoto path={listing.photo_path} missingLabel={t('list.photoMissing')} />
      <div className="flex min-w-0 flex-col gap-3.5 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-2">
            <h2
              id={titleId}
              className="text-[22px] leading-[1.25] font-bold tracking-[-0.02em] text-foreground"
            >
              {listing.title}
            </h2>
            <p className="text-body-sm text-muted-foreground">
              {t('list.addressCity', { street: listing.street_label, city: listing.city })}
            </p>
          </div>
          <StatusPill
            shape="tag"
            tone={meta.tone}
            icon={meta.icon}
            label={t(`status.${listing.status}`)}
          />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
          <p className="text-[28px] leading-tight font-extrabold tracking-[-0.03em] text-foreground tabular-nums">
            {price}
          </p>
          <p className="text-body-sm text-muted-foreground">{facts.join(' · ')}</p>
        </div>
        {reasonStatus && decision?.message ? (
          <p
            className={cn(
              'rounded-md px-3 py-2.5 text-small leading-copy whitespace-pre-line',
              reasonBoxClass[reasonStatus],
            )}
          >
            <strong className="font-bold">{t('list.reasonLabel')}</strong> {decision.message}
          </p>
        ) : null}
        {isApproved && note ? (
          <p
            className={cn(
              'rounded-md px-3 py-2.5 text-small leading-copy whitespace-pre-line',
              note === 'rejected' ? reasonBoxClass.rejected : 'bg-info-surface text-info-ink',
            )}
          >
            {t(`list.revision.${note}`)}
            {note === 'rejected' && revisionDecision?.message ? (
              <>
                {' '}
                <strong className="font-bold">{t('list.reasonLabel')}</strong>{' '}
                {revisionDecision.message}
              </>
            ) : null}
          </p>
        ) : null}
        {isEditable || isApproved ? (
          <div className="mt-auto flex flex-wrap justify-end gap-2 pt-1">
            {isEditable ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/account/listings/$listingId" params={{ listingId: listing.id }}>
                  <PencilIcon aria-hidden />
                  {t('list.edit')}
                </Link>
              </Button>
            ) : null}
            {canEditApproved ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={startRevision.isPending}
                aria-busy={startRevision.isPending}
                onClick={handleEditApproved}
              >
                <PencilIcon aria-hidden />
                {revision ? t('list.continueEdit') : t('list.edit')}
              </Button>
            ) : null}
            {isApproved ? (
              <Button type="button" variant="ghost" size="sm">
                <ExternalLinkIcon aria-hidden />
                {t('list.view')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

type CoverPhotoProps = {
  path: string | null;
  missingLabel: string;
};

function CoverPhoto({ path, missingLabel }: CoverPhotoProps) {
  const [isMediumMissing, setIsMediumMissing] = useState(false);

  if (!path) {
    return (
      <div className="flex aspect-4/3 flex-col items-center justify-center gap-2 bg-surface-sunken text-small text-muted-foreground sm:aspect-auto sm:min-h-56">
        <ImageOffIcon aria-hidden className="size-6" />
        {missingLabel}
      </div>
    );
  }
  return (
    <img
      src={isMediumMissing ? getListingPhotoUrl(path) : getListingMediumUrl(path)}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => {
        setIsMediumMissing(true);
      }}
      className="aspect-4/3 size-full bg-surface-alt object-cover sm:aspect-auto sm:min-h-56"
    />
  );
}
