import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import { myListingQueries } from '../api/my-listings.queries';
import { isEditableStatus, OWNER_STATUS_META, type ListingStatus } from '../listing-status';
import { ListingDecisionNotice } from './listing-decision-notice';
import { ListingOverview } from './listing-overview';
import { ListingWizard } from './listing-wizard';

const authenticatedRoute = getRouteApi('/_authenticated');

type ListingEditorPageProps = {
  listingId?: string;
  step: number;
  onStepChange: (step: number) => void;
};

export function ListingEditorPage({ listingId, step, onStepChange }: ListingEditorPageProps) {
  const { t } = useTranslation('myListings');
  const { user } = authenticatedRoute.useRouteContext();

  if (!listingId) {
    return (
      <EditorLayout title={t('editor.newTitle')} subtitle={t('wizard.subtitle')}>
        <ListingWizard
          listing={null}
          ownerId={user.id}
          email={user.email}
          step={step}
          onStepChange={onStepChange}
        />
      </EditorLayout>
    );
  }
  return (
    <ExistingListing
      listingId={listingId}
      ownerId={user.id}
      email={user.email}
      step={step}
      onStepChange={onStepChange}
    />
  );
}

type ExistingListingProps = {
  listingId: string;
  ownerId: string;
  email: string | undefined;
  step: number;
  onStepChange: (step: number) => void;
};

function ExistingListing({ listingId, ownerId, email, step, onStepChange }: ExistingListingProps) {
  const { t } = useTranslation('myListings');
  const { data: listing } = useSuspenseQuery(myListingQueries.detail(listingId, ownerId));
  const [latestDecision] = listing.decisions;

  if (!isEditableStatus(listing.status)) {
    return (
      <EditorLayout title={listing.title} status={listing.status}>
        <ListingDecisionNotice status={listing.status} decision={latestDecision} />
        <ListingOverview listing={listing} ownerId={ownerId} email={email} />
      </EditorLayout>
    );
  }
  return (
    <EditorLayout
      title={t('editor.editTitle')}
      subtitle={t('wizard.subtitle')}
      status={listing.status}
    >
      {listing.status === 'rejected' ? (
        <ListingDecisionNotice status={listing.status} decision={latestDecision} />
      ) : null}
      <ListingWizard
        key={`${listing.id}-${listing.status}`}
        listing={listing}
        ownerId={ownerId}
        email={email}
        step={step}
        onStepChange={onStepChange}
      />
    </EditorLayout>
  );
}

type EditorLayoutProps = {
  title: string;
  subtitle?: string;
  status?: ListingStatus;
  children: ReactNode;
};

function EditorLayout({ title, subtitle, status, children }: EditorLayoutProps) {
  const { t } = useTranslation('myListings');
  const meta = status ? OWNER_STATUS_META[status] : undefined;

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          to="/account/listings"
          className="inline-flex w-fit items-center gap-1.5 rounded-md text-small font-bold text-brand hover:text-link-hover focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          {t('editor.back')}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h2 leading-heading text-foreground">{title}</h1>
          {status && meta ? (
            <StatusPill
              shape="tag"
              tone={meta.tone}
              icon={meta.icon}
              label={t(`status.${status}`)}
            />
          ) : null}
        </div>
        {subtitle ? <p className="text-small text-muted-foreground">{subtitle}</p> : null}
      </header>
      {children}
    </div>
  );
}
