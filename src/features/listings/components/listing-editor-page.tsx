import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  myListingQueries,
  useCreateListing,
  useSubmitListing,
  useUpdateListing,
} from '../api/my-listings.queries';
import {
  toListingFormValues,
  toListingWrite,
  type ListingFormValues,
} from '../listing-form.schemas';
import { isEditableStatus } from '../listing-status';
import { ListingDecisionNotice } from './listing-decision-notice';
import { ListingForm, type ListingFormAction } from './listing-form';
import { ListingPhotosField } from './listing-photos-field';

const authenticatedRoute = getRouteApi('/_authenticated');

type ListingEditorPageProps = {
  listingId?: string;
};

export function ListingEditorPage({ listingId }: ListingEditorPageProps) {
  const { user } = authenticatedRoute.useRouteContext();

  return listingId ? (
    <ExistingListingEditor listingId={listingId} ownerId={user.id} />
  ) : (
    <NewListingEditor />
  );
}

function EditorHeader({ title }: { title: string }) {
  const { t } = useTranslation('myListings');

  return (
    <header className="flex flex-col gap-2">
      <Link
        to="/account/listings"
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-small font-bold text-brand hover:text-link-hover focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        {t('editor.back')}
      </Link>
      <h1 className="text-h2 leading-heading text-foreground">{title}</h1>
    </header>
  );
}

function NewListingEditor() {
  const { t } = useTranslation('myListings');
  const navigate = useNavigate();
  const createListing = useCreateListing();

  const handleSave = async (values: ListingFormValues) => {
    const created = await createListing.mutateAsync(toListingWrite(values));
    toast.success(t('editor.saved'));
    await navigate({
      to: '/account/listings/$listingId',
      params: { listingId: created.id },
      replace: true,
    });
  };

  return (
    <div className="flex max-w-narrow flex-col gap-5">
      <EditorHeader title={t('editor.newTitle')} />
      <ListingDecisionNotice status="draft" decision={undefined} />
      <ListingForm
        defaultValues={toListingFormValues(null)}
        isEditable
        isPending={createListing.isPending}
        saveLabel={t('editor.save')}
        onSave={handleSave}
        photos={<ListingPhotosField ownerId="" listingId={null} photos={[]} isEditable />}
      />
    </div>
  );
}

type ExistingListingEditorProps = {
  listingId: string;
  ownerId: string;
};

function ExistingListingEditor({ listingId, ownerId }: ExistingListingEditorProps) {
  const { t } = useTranslation('myListings');
  const navigate = useNavigate();
  const { data: listing } = useSuspenseQuery(myListingQueries.detail(listingId, ownerId));
  const updateListing = useUpdateListing();
  const submitListing = useSubmitListing();
  const isEditable = isEditableStatus(listing.status);
  const isRejected = listing.status === 'rejected';
  const [latestDecision] = listing.decisions;

  const handleSave = async (values: ListingFormValues, action: ListingFormAction) => {
    await updateListing.mutateAsync({ id: listing.id, values: toListingWrite(values) });
    if (action === 'save') {
      toast.success(t('editor.saved'));
      return;
    }
    await submitListing.mutateAsync(listing.id);
    toast.success(isRejected ? t('editor.resubmitted') : t('editor.submitted'));
    await navigate({ to: '/account/listings' });
  };

  return (
    <div className="flex max-w-narrow flex-col gap-5">
      <EditorHeader title={isEditable ? t('editor.editTitle') : listing.title} />
      <ListingDecisionNotice status={listing.status} decision={latestDecision} />
      <ListingForm
        key={`${listing.id}-${listing.status}`}
        defaultValues={toListingFormValues(listing)}
        isEditable={isEditable}
        isPending={updateListing.isPending || submitListing.isPending}
        saveLabel={isRejected ? t('editor.saveChanges') : t('editor.save')}
        submitLabel={isRejected ? t('editor.resubmit') : t('editor.submit')}
        onSave={handleSave}
        photos={
          <ListingPhotosField
            ownerId={ownerId}
            listingId={listing.id}
            photos={listing.photos}
            isEditable={isEditable}
          />
        }
      />
    </div>
  );
}
