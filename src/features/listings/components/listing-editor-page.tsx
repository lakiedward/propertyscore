import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon, Undo2Icon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { StatusPill } from '@/components/feedback/status-pill';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { myListingQueries, useDiscardListingRevision } from '../api/my-listings.queries';
import { OWNER_STATUS_META, type ListingStatus } from '../listing-status';
import type { MyListing } from '../listing.types';
import { ListingDecisionNotice } from './listing-decision-notice';
import type { EditorSection } from '../listing-editor.sections';
import { ListingEditorForm } from './listing-editor-form';

const authenticatedRoute = getRouteApi('/_authenticated');

type ListingEditorPageProps = {
  listingId?: string;
  section: EditorSection | undefined;
};

export function ListingEditorPage({ listingId, section }: ListingEditorPageProps) {
  const { t } = useTranslation('myListings');
  const { user } = authenticatedRoute.useRouteContext();

  if (!listingId) {
    return (
      <EditorLayout title={t('editor.newTitle')} subtitle={t('wizard.subtitle')}>
        <ListingEditorForm
          listing={null}
          ownerId={user.id}
          email={user.email}
          initialSection={section}
        />
      </EditorLayout>
    );
  }
  return (
    <ExistingListing listingId={listingId} ownerId={user.id} email={user.email} section={section} />
  );
}

type ExistingListingProps = {
  listingId: string;
  ownerId: string;
  email: string | undefined;
  section: EditorSection | undefined;
};

function ExistingListing({ listingId, ownerId, email, section }: ExistingListingProps) {
  const { t } = useTranslation('myListings');
  const { data: listing } = useSuspenseQuery(myListingQueries.detail(listingId, ownerId));
  const [latestDecision] = listing.decisions;
  const isRevision = listing.revision_of !== null;

  return (
    <EditorLayout
      title={t('editor.editTitle')}
      subtitle={isRevision ? undefined : t('wizard.subtitle')}
      status={listing.status}
    >
      {isRevision ? <RevisionNotice listing={listing} /> : null}
      {listing.status === 'rejected' ? (
        <ListingDecisionNotice decision={latestDecision} isRevision={isRevision} />
      ) : null}
      <ListingEditorForm
        key={`${listing.id}-${listing.status}`}
        listing={listing}
        ownerId={ownerId}
        email={email}
        initialSection={section}
      />
    </EditorLayout>
  );
}

function RevisionNotice({ listing }: { listing: MyListing }) {
  const { t } = useTranslation(['myListings', 'common']);
  const navigate = useNavigate();
  const discard = useDiscardListingRevision();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleDiscard = () => {
    discard.mutate(
      { revisionId: listing.id, photoPaths: listing.photos.map((photo) => photo.path) },
      {
        onSuccess: () => {
          setIsConfirmOpen(false);
          toast.success(t('notice.revision.discarded'));
          void navigate({ to: '/account/listings' });
        },
      },
    );
  };

  return (
    <Alert tone="info">
      <AlertTitle>{t('notice.revision.title')}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <span>{t('notice.revision.description')}</span>
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          title={t('notice.revision.discardTitle')}
          description={t('notice.revision.discardDescription')}
          confirmLabel={t('notice.revision.discard')}
          pendingLabel={t('notice.revision.discarding')}
          confirmIcon={Undo2Icon}
          tone="destructive"
          isPending={discard.isPending}
          onConfirm={handleDiscard}
          trigger={
            <Button type="button" variant="outline" size="sm">
              <Undo2Icon aria-hidden />
              {t('notice.revision.discard')}
            </Button>
          }
        />
      </AlertDescription>
    </Alert>
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
