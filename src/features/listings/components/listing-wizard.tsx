import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon, ArrowRightIcon, SendIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Stepper } from '@/components/navigation/stepper';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useErrorMessage } from '@/i18n/error-message';
import { formatNumber } from '@/i18n/format';
import { isAppError } from '@/lib/errors';
import { applyServerErrors } from '@/lib/forms';
import { useCreateListing, useSubmitListing, useUpdateListing } from '../api/my-listings.queries';
import {
  listingFormSchema,
  toListingFormValues,
  toListingWrite,
  type ListingFormValues,
} from '../listing-form.schemas';
import type { MyListing } from '../listing.types';
import {
  DRAFT_STEP_COUNT,
  firstStepWithError,
  STEP_FIELDS,
  stepAt,
  WIZARD_STEPS,
} from '../listing-wizard.steps';
import { ListingAddressStep } from './listing-address-step';
import { ListingContactCard } from './listing-contact-card';
import { ListingDetailsStep } from './listing-details-step';
import { ListingPhotosField } from './listing-photos-field';
import { ListingTextStep } from './listing-text-step';
import { ListingTypeStep } from './listing-type-step';

type ListingWizardProps = {
  listing: MyListing | null;
  ownerId: string;
  email: string | undefined;
  step: number;
  onStepChange: (step: number) => void;
};

export function ListingWizard({ listing, ownerId, email, step, onStepChange }: ListingWizardProps) {
  const { t } = useTranslation('myListings');
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const headingId = useId();
  const [formError, setFormError] = useState<unknown>(null);
  const createListing = useCreateListing();
  const updateListing = useUpdateListing();
  const submitListing = useSubmitListing();
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: toListingFormValues(listing),
  });
  const total = WIZARD_STEPS.length;
  const position = Math.min(Math.max(step, 1), listing ? total : DRAFT_STEP_COUNT);
  const current = stepAt(position);
  const isPending = createListing.isPending || updateListing.isPending || submitListing.isPending;
  const isRejected = listing?.status === 'rejected';

  const validateAll = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      const result = listingFormSchema.safeParse(form.getValues());
      const fields = result.success
        ? []
        : result.error.issues.map((issue) => String(issue.path[0]));
      onStepChange(firstStepWithError(fields));
    }
    return isValid;
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
    try {
      await action();
    } catch (error) {
      if (applyServerErrors(form, error) && isAppError(error) && error.field) {
        onStepChange(firstStepWithError([error.field]));
        return;
      }
      setFormError(error);
    }
  };

  const openCreated = (id: string, nextStep: number) =>
    navigate({
      to: '/account/listings/$listingId',
      params: { listingId: id },
      search: { step: nextStep },
      replace: true,
    });

  const handleContinue = () =>
    run(async () => {
      const isStepValid = await form.trigger([...STEP_FIELDS[current]]);
      if (!isStepValid) {
        return;
      }
      const needsSave =
        position <= DRAFT_STEP_COUNT &&
        (listing ? form.formState.isDirty : position === DRAFT_STEP_COUNT);
      if (needsSave) {
        if (!(await validateAll())) {
          return;
        }
        const id = await persist(form.getValues());
        if (!listing) {
          toast.success(t('editor.saved'));
          await openCreated(id, position + 1);
          return;
        }
      }
      onStepChange(position + 1);
    });

  const handleSave = () =>
    run(async () => {
      if (!(await validateAll())) {
        return;
      }
      const id = await persist(form.getValues());
      toast.success(t('editor.saved'));
      if (!listing) {
        await openCreated(id, Math.min(position + 1, total));
      }
    });

  const handleSubmitForReview = () =>
    run(async () => {
      if (!listing || !(await validateAll())) {
        return;
      }
      await persist(form.getValues());
      await submitListing.mutateAsync(listing.id);
      toast.success(isRejected ? t('editor.resubmitted') : t('editor.submitted'));
      await navigate({ to: '/account/listings' });
    });

  const isLastStep = position === total;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void (isLastStep ? handleSubmitForReview() : handleContinue());
      }}
      className="flex flex-col gap-5"
    >
      <Stepper
        label={t('wizard.stepsLabel')}
        steps={WIZARD_STEPS.map((id) => ({ id, label: t(`wizard.steps.${id}`) }))}
        current={position}
      />
      <section
        aria-labelledby={headingId}
        className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5 sm:p-6"
      >
        <div className="flex flex-col gap-1">
          <p className="text-eyebrow leading-copy font-bold tracking-eyebrow text-muted-foreground uppercase">
            {t('wizard.stepOf', { step: formatNumber(position), total: formatNumber(total) })}
          </p>
          <h2
            id={headingId}
            className="text-[20px] leading-tight font-bold tracking-[-0.015em] text-foreground"
          >
            {t(`wizard.titles.${current}`)}
          </h2>
        </div>
        {current === 'type' ? (
          <ListingTypeStep control={form.control} labelledBy={headingId} />
        ) : null}
        {current === 'text' ? <ListingTextStep control={form.control} /> : null}
        {current === 'details' ? <ListingDetailsStep control={form.control} /> : null}
        {current === 'address' ? (
          <ListingAddressStep control={form.control} isNew={listing === null} />
        ) : null}
        {current === 'photos' && listing ? (
          <ListingPhotosField
            ownerId={ownerId}
            listingId={listing.id}
            photos={listing.photos}
            isEditable
          />
        ) : null}
        {current === 'contact' ? (
          <div className="flex flex-col gap-4">
            <ListingContactCard ownerId={ownerId} email={email} />
            <p className="rounded-md bg-surface-sunken px-4 py-3 text-small text-muted-foreground">
              {t('wizard.contact.ready')}
            </p>
          </div>
        ) : null}
      </section>
      {formError ? (
        <Alert tone="error">
          <AlertDescription>{errorMessage(formError)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={position === 1 || isPending}
          onClick={() => {
            onStepChange(position - 1);
          }}
        >
          <ArrowLeftIcon aria-hidden />
          {t('wizard.back')}
        </Button>
        <div className="flex flex-wrap gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={isPending}
            onClick={() => void handleSave()}
          >
            {isRejected ? t('editor.saveChanges') : t('editor.save')}
          </Button>
          <Button type="submit" size="md" disabled={isPending} aria-busy={isPending}>
            {isLastStep ? <SendIcon aria-hidden /> : null}
            {isPending
              ? t('editor.saving')
              : isLastStep
                ? isRejected
                  ? t('editor.resubmit')
                  : t('editor.submit')
                : t('wizard.continue')}
            {isLastStep ? null : <ArrowRightIcon aria-hidden />}
          </Button>
        </div>
      </div>
    </form>
  );
}
