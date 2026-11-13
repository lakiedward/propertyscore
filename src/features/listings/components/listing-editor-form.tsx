import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import {
  Building2Icon,
  CircleAlertIcon,
  HouseIcon,
  KeyRoundIcon,
  SendIcon,
  TagIcon,
} from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { StatusPill } from '@/components/feedback/status-pill';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useErrorMessage } from '@/i18n/error-message';
import { validationMessage } from '@/i18n/validation';
import { isAppError } from '@/lib/errors';
import { applyServerErrors } from '@/lib/forms';
import { getListingMediumUrl } from '../api/listings.storage';
import {
  useAddListingPhotos,
  useCreateListing,
  useRemoveListingPhoto,
  useReorderListingPhotos,
  useSubmitListing,
  useUpdateListing,
} from '../api/my-listings.queries';
import { usePendingListingPhotos } from '../hooks/use-pending-listing-photos';
import {
  EDITOR_SECTIONS,
  fieldsOf,
  isEditorSection,
  REQUIRED_SECTIONS,
  SECTION_FIELDS,
  sectionsWithErrors,
  type EditorSection,
} from '../listing-editor.sections';
import {
  LISTING_MIN_PHOTOS,
  listingFormSchema,
  toListingFormValues,
  toListingWrite,
  type ListingFormValues,
} from '../listing-form.schemas';
import type { MyListing } from '../listing.types';
import { ListingAddressSection } from './listing-address-section';
import { ListingContactCard } from './listing-contact-card';
import { ListingDetailsSection } from './listing-details-section';
import { ListingExtrasSection } from './listing-extras-section';
import { ListingPhotosField, type ListingPhotoItem } from './listing-photos-field';
import { ListingTextSection } from './listing-text-section';
import { ListingTileField } from './listing-tile-field';

type SectionStatus = { tone: 'error' | 'success'; label: string } | undefined;

type ListingEditorFormProps = {
  listing: MyListing | null;
  ownerId: string;
  email: string | undefined;
  initialSection: EditorSection | undefined;
};

function union<T>(current: readonly T[], added: readonly T[]): T[] {
  return [...new Set([...current, ...added])];
}

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
  const propertyTypeHeadingId = useId();
  const transactionHeadingId = useId();
  const firstSection = initialSection ?? 'details';
  const [openSections, setOpenSections] = useState<EditorSection[]>([firstSection]);
  const [visited, setVisited] = useState<readonly EditorSection[]>([firstSection]);
  const [checked, setChecked] = useState<readonly EditorSection[]>([]);
  const [hasMarkedErrors, setHasMarkedErrors] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);
  const createListing = useCreateListing();
  const updateListing = useUpdateListing();
  const submitListing = useSubmitListing();
  const addPhotos = useAddListingPhotos();
  const removePhoto = useRemoveListingPhoto();
  const reorderPhotos = useReorderListingPhotos();
  const pendingPhotos = usePendingListingPhotos();
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    mode: 'onTouched',
    defaultValues: toListingFormValues(listing),
  });
  const { errors } = form.formState;
  const isPending =
    createListing.isPending ||
    updateListing.isPending ||
    submitListing.isPending ||
    addPhotos.isPending;
  const isRejected = listing?.status === 'rejected';
  const isRevision = Boolean(listing?.revision_of);
  const photoItems: ListingPhotoItem[] = listing
    ? listing.photos.map((photo) => ({ id: photo.id, src: getListingMediumUrl(photo.path) }))
    : [...pendingPhotos.photos];
  const missingPhotos = Math.max(0, LISTING_MIN_PHOTOS - photoItems.length);
  const sectionId = (section: EditorSection) => `${formId}-${section}`;

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

  const sectionStatus = (section: EditorSection): SectionStatus => {
    if (section === 'contact') {
      return undefined;
    }
    if (section === 'extras') {
      const invalid = SECTION_FIELDS.extras.filter((field) => errors[field]).length;
      return invalid > 0
        ? { tone: 'error', label: t('sections.missing', { count: invalid }) }
        : undefined;
    }
    if (section === 'photos') {
      if (missingPhotos === 0) {
        return { tone: 'success', label: t('sections.complete') };
      }
      return checked.includes('photos')
        ? { tone: 'error', label: t('sections.photosMissing', { count: missingPhotos }) }
        : undefined;
    }
    const missing = SECTION_FIELDS[section].filter((field) => errors[field]).length;
    if (missing > 0) {
      return { tone: 'error', label: t('sections.missing', { count: missing }) };
    }
    return checked.includes(section)
      ? { tone: 'success', label: t('sections.complete') }
      : undefined;
  };

  const checkSections = async (sections: readonly EditorSection[]) => {
    const fields = fieldsOf(sections);
    if (fields.length > 0) {
      await form.trigger(fields);
    }
    setChecked((current) => union(current, sections));
  };

  const handleOpenChange = (values: string[]) => {
    const next = values.filter(isEditorSection);
    const opened = next.filter((section) => !openSections.includes(section));
    void checkSections(visited.filter((section) => !opened.includes(section)));
    setVisited((current) => union(current, next));
    setOpenSections(next);
  };

  const revealErrors = (sections: readonly EditorSection[], fields: readonly string[]) => {
    const [first] = sections;
    if (!first) {
      return;
    }
    flushSync(() => {
      setOpenSections((current) => union(current, sections));
      setVisited((current) => union(current, sections));
      setChecked((current) => union(current, sections));
      setHasMarkedErrors(true);
    });
    const field = fieldsOf(EDITOR_SECTIONS).find((name) => fields.includes(name));
    if (field) {
      form.setFocus(field);
    }
    const element = document.getElementById(sectionId(first));
    if (element && !element.contains(document.activeElement)) {
      element.scrollIntoView({ block: 'start' });
    }
  };

  const revealInvalidSections = (fields: readonly string[]) => {
    const sections = sectionsWithErrors(fields);
    const withPhotos = missingPhotos > 0 ? union(sections, ['photos']) : sections;
    const ordered = EDITOR_SECTIONS.filter((section) => withPhotos.includes(section));
    revealErrors(ordered, fields);
    return ordered.length === 0;
  };

  const invalidFields = async (): Promise<string[]> => {
    await form.trigger();
    const result = listingFormSchema.safeParse(form.getValues());
    return result.success
      ? []
      : [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
  };

  const validateDraft = async () => revealInvalidSections(await invalidFields());

  const validateForReview = async () => {
    const fields = await invalidFields();
    if (form.getValues('description').trim() === '') {
      form.setError('description', { type: 'required', message: validationMessage('required') });
      fields.push('description');
    }
    return revealInvalidSections(fields);
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
    setHasMarkedErrors(false);
    try {
      await action();
    } catch (error) {
      if (applyServerErrors(form, error) && isAppError(error) && error.field) {
        revealErrors(sectionsWithErrors([error.field]), [error.field]);
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
        await addPhotos.mutateAsync({
          ownerId,
          listingId: id,
          files: pendingPhotos.photos.map((photo) => photo.file),
          nextPosition: 0,
        });
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

  const handleAddPhotos = (files: File[]) => {
    if (listing) {
      addPhotos.mutate({ ownerId, listingId: listing.id, files, nextPosition: photoItems.length });
    } else {
      pendingPhotos.add(files);
    }
  };

  const handleReorderPhotos = (photoIds: string[]) => {
    if (listing) {
      reorderPhotos.mutate({ ownerId, listingId: listing.id, photoIds });
    } else {
      pendingPhotos.reorder(photoIds);
    }
  };

  const handleRemovePhoto = (id: string) => {
    const saved = listing?.photos.find((photo) => photo.id === id);
    if (saved && listing) {
      removePhoto.mutate({ id: saved.id, path: saved.path, listingId: listing.id });
    } else {
      pendingPhotos.remove(id);
    }
  };

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
        photos={photoItems}
        isEditable
        isAdding={addPhotos.isPending}
        isBusy={isPending || removePhoto.isPending}
        error={listing ? (addPhotos.error ?? removePhoto.error ?? reorderPhotos.error) : null}
        onAdd={handleAddPhotos}
        onRemove={handleRemovePhoto}
        onReorder={handleReorderPhotos}
      />
    ),
    address: <ListingAddressSection control={form.control} />,
    text: <ListingTextSection control={form.control} />,
    extras: <ListingExtrasSection control={form.control} />,
    contact: (
      <div className="flex flex-col gap-4">
        <ListingContactCard ownerId={ownerId} email={email} />
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
      <section className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-3.5">
          <h2 id={propertyTypeHeadingId} className="text-h4 text-foreground">
            {t('sections.propertyType')}
          </h2>
          <ListingTileField
            control={form.control}
            name="property_type"
            labelledBy={propertyTypeHeadingId}
            options={[
              {
                value: 'apartment',
                icon: Building2Icon,
                label: t('wizard.propertyType.apartment.label'),
                hint: t('wizard.propertyType.apartment.hint'),
              },
              {
                value: 'house',
                icon: HouseIcon,
                label: t('wizard.propertyType.house.label'),
                hint: t('wizard.propertyType.house.hint'),
              },
            ]}
          />
        </div>
        <div className="flex flex-col gap-3.5">
          <h2 id={transactionHeadingId} className="text-h4 text-foreground">
            {t('sections.transactionType')}
          </h2>
          <ListingTileField
            control={form.control}
            name="transaction"
            labelledBy={transactionHeadingId}
            options={[
              {
                value: 'sale',
                icon: TagIcon,
                label: t('wizard.type.sale.label'),
                hint: t('wizard.type.sale.hint'),
              },
              {
                value: 'rent',
                icon: KeyRoundIcon,
                label: t('wizard.type.rent.label'),
                hint: t('wizard.type.rent.hint'),
              },
            ]}
          />
        </div>
      </section>
      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={handleOpenChange}
        className="gap-3"
      >
        {EDITOR_SECTIONS.map((section) => {
          const status = sectionStatus(section);
          const isRequired = REQUIRED_SECTIONS.includes(section);
          return (
            <AccordionItem
              key={section}
              value={section}
              id={sectionId(section)}
              data-invalid={status?.tone === 'error' ? true : undefined}
              className="scroll-mt-24 rounded-lg border border-border bg-card data-invalid:border-destructive"
            >
              <AccordionTrigger className="px-5 py-4 text-h4 text-foreground sm:px-6">
                <span className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span>
                    {t(`sections.${section}`)}
                    {section === 'extras' ? (
                      <span className="text-body-sm font-semibold text-muted-foreground">
                        {` (${t('sections.optional')})`}
                      </span>
                    ) : null}
                    {isRequired ? (
                      <>
                        <span aria-hidden className="text-destructive">
                          {' *'}
                        </span>
                        <span className="sr-only">{t('sections.required')}</span>
                      </>
                    ) : null}
                  </span>
                  {status ? <StatusPill tone={status.tone} label={status.label} /> : null}
                </span>
              </AccordionTrigger>
              <AccordionContent className="h-auto px-5 pb-5 sm:px-6 [&_p:not(:last-child)]:mb-0">
                {sectionContent[section]}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      {hasMarkedErrors ? (
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
