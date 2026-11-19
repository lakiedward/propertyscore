import { zodResolver } from '@hookform/resolvers/zod';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { CircleAlertIcon, SendIcon } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { authQueries } from '@/features/auth';
import { useErrorMessage } from '@/i18n/error-message';
import { validationMessage } from '@/i18n/validation';
import { isAppError } from '@/lib/errors';
import { applyServerErrors } from '@/lib/forms';
import {
  myListingQueries,
  useCreateListing,
  useSubmitListing,
  useUpdateListing,
} from '../api/my-listings.queries';
import { useEditorSections } from '../hooks/use-editor-sections';
import { useListingEditorPhotos } from '../hooks/use-listing-editor-photos';
import {
  EDITOR_SECTIONS,
  fieldsOf,
  REQUIRED_SECTIONS,
  sectionsWithErrors,
  type EditorSection,
} from '../listing-editor.sections';
import {
  listingFormSchema,
  toListingFormValues,
  toListingWrite,
  type ListingFormValues,
} from '../listing-form.schemas';
import type { MyListing } from '../listing.types';
import { EditorSectionTitle } from './editor-section-title';
import { ListingAddressSection } from './listing-address-section';
import { ListingContactCard } from './listing-contact-card';
import { ListingDetailsSection } from './listing-details-section';
import { ListingExtrasSection } from './listing-extras-section';
import { ListingPhotosField } from './listing-photos-field';
import { ListingTextSection } from './listing-text-section';
import { ListingTypeCard } from './listing-type-card';

type ListingEditorFormProps = {
  listing: MyListing | null;
  ownerId: string;
  email: string | undefined;
  initialSection: EditorSection | undefined;
};

export function ListingEditorForm({
  listing,
  ownerId,
  email,
  initialSection,
}: ListingEditorFormProps) {
  const { t } = useTranslation('myListings');
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const formId = useId();
  const [formError, setFormError] = useState<unknown>(null);
  const { data: cities } = useSuspenseQuery(myListingQueries.cities());
  const { data: phone } = useSuspenseQuery(authQueries.accountPhone(ownerId));
  const createListing = useCreateListing();
  const updateListing = useUpdateListing();
  const submitListing = useSubmitListing();
  const photos = useListingEditorPhotos(listing, ownerId);
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    mode: 'onTouched',
    defaultValues: toListingFormValues(listing),
  });
  const sectionId = (section: EditorSection) => `${formId}-${section}`;
  const sections = useEditorSections({
    form,
    initialSection,
    missingPhotos: photos.missingPhotos,
    sectionId,
  });
  const isPending =
    createListing.isPending ||
    updateListing.isPending ||
    submitListing.isPending ||
    photos.isAdding;
  const isRejected = listing?.status === 'rejected';
  const isRevision = Boolean(listing?.revision_of);

  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ name, type }) => {
          const field = fieldsOf(EDITOR_SECTIONS).find((candidate) => candidate === name);
          if (type === 'change' && field && form.getFieldState(field).invalid) {
            void form.trigger(field);
          }
        },
      }),
    [form],
  );

  const invalidFields = async (): Promise<string[]> => {
    await form.trigger();
    const result = listingFormSchema.safeParse(form.getValues());
    return result.success
      ? []
      : [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
  };

  const validateDraft = async () => sections.revealInvalidSections(await invalidFields());

  const validateForReview = async () => {
    const fields = await invalidFields();
    if (form.getValues('description').trim() === '') {
      form.setError('description', { type: 'required', message: validationMessage('required') });
      fields.push('description');
    }
    return sections.revealInvalidSections(fields);
  };

  const persist = async (values: ListingFormValues): Promise<string> => {
    if (listing) {
      await updateListing.mutateAsync({ id: listing.id, values: toListingWrite(values) });
      form.reset(values);
      return listing.id;
    }
    const created = await createListing.mutateAsync(toListingWrite(values));
    return created.id;
  };

  const run = async (action: () => Promise<void>) => {
    setFormError(null);
    sections.clearMarkedErrors();
    try {
      await action();
    } catch (error) {
      if (applyServerErrors(form, error) && isAppError(error) && error.field) {
        sections.revealErrors(sectionsWithErrors([error.field]), [error.field]);
        return;
      }
      setFormError(error);
    }
  };

  const handleSave = () =>
    run(async () => {
      if (!(await validateDraft())) {
        return;
      }
      const id = await persist(form.getValues());
      if (listing) {
        toast.success(t('editor.saved'));
        return;
      }
      try {
        await photos.uploadPending(id);
        toast.success(t('editor.saved'));
      } catch (error) {
        toast.error(t('photos.uploadFailed', { reason: errorMessage(error) }));
      }
      await navigate({
        to: '/account/listings/$listingId',
        params: { listingId: id },
        search: { section: 'photos' },
        replace: true,
      });
    });

  const handleSubmitForReview = () =>
    run(async () => {
      if (!listing || !(await validateForReview())) {
        return;
      }
      await persist(form.getValues());
      await submitListing.mutateAsync(listing.id);
      toast.success(
        isRevision
          ? t('editor.changesSubmitted')
          : isRejected
            ? t('editor.resubmitted')
            : t('editor.submitted'),
      );
      await navigate({ to: '/account/listings' });
    });

  const sectionContent: Record<EditorSection, ReactNode> = {
    details: <ListingDetailsSection control={form.control} />,
    photos: (
      <ListingPhotosField
        photos={photos.photoItems}
        isEditable
        isAdding={photos.isAdding}
        isBusy={isPending || photos.isRemoving}
        error={photos.error}
        onAdd={photos.add}
        onRemove={photos.remove}
        onReorder={photos.reorder}
      />
    ),
    address: <ListingAddressSection control={form.control} cities={cities} />,
    text: <ListingTextSection control={form.control} />,
    extras: <ListingExtrasSection control={form.control} />,
    contact: (
      <div className="flex flex-col gap-4">
        <ListingContactCard phone={phone} email={email} />
        {listing ? (
          <p className="rounded-md bg-surface-sunken px-4 py-3 text-small text-muted-foreground">
            {t('wizard.contact.ready')}
          </p>
        ) : null}
      </div>
    ),
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
      className="flex flex-col gap-3"
    >
      <ListingTypeCard control={form.control} />
      <Accordion
        type="multiple"
        value={sections.openSections}
        onValueChange={sections.handleOpenChange}
        className="gap-3"
      >
        {EDITOR_SECTIONS.map((section) => {
          const status = sections.sectionStatus(section);
          return (
            <AccordionItem
              key={section}
              value={section}
              id={sectionId(section)}
              data-invalid={status?.tone === 'error' ? true : undefined}
              className="scroll-mt-24 rounded-lg border border-card bg-card shadow-card-soft data-invalid:border-destructive"
            >
              <AccordionTrigger className="px-5 py-4 text-h4 text-foreground sm:px-6">
                <EditorSectionTitle
                  section={section}
                  isRequired={REQUIRED_SECTIONS.includes(section)}
                  status={status}
                />
              </AccordionTrigger>
              <AccordionContent className="h-auto px-5 pb-5 sm:px-6 [&_p:not(:last-child)]:mb-0">
                {sectionContent[section]}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      {sections.hasMarkedErrors ? (
        <Alert tone="error">
          <CircleAlertIcon aria-hidden />
          <AlertDescription>{t('sections.markedErrors')}</AlertDescription>
        </Alert>
      ) : null}
      {formError ? (
        <Alert tone="error">
          <AlertDescription>{errorMessage(formError)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-2.5 rounded-lg border border-border bg-card p-3 shadow-md">
        {listing ? (
          <>
            <Button type="submit" variant="outline" size="md" disabled={isPending}>
              {isRejected ? t('editor.saveChanges') : t('editor.save')}
            </Button>
            <Button
              type="button"
              size="md"
              disabled={isPending}
              aria-busy={submitListing.isPending}
              onClick={() => void handleSubmitForReview()}
            >
              <SendIcon aria-hidden />
              {submitListing.isPending
                ? t('editor.submitting')
                : isRevision
                  ? t('editor.submitChanges')
                  : isRejected
                    ? t('editor.resubmit')
                    : t('editor.submit')}
            </Button>
          </>
        ) : (
          <Button type="submit" size="md" disabled={isPending} aria-busy={isPending}>
            {isPending ? t('editor.saving') : t('editor.save')}
          </Button>
        )}
      </div>
    </form>
  );
}
