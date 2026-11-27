import { cva } from 'class-variance-authority';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import {
  CalendarDaysIcon,
  CreditCardIcon,
  HouseIcon,
  LockIcon,
  MapPinIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TilePicker } from '@/components/forms/tile-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { SERVICE_PRICES } from '@/config/pricing';
import { authQueries } from '@/features/auth';
import { useAccountIdentity } from '@/features/profile';
import { useErrorMessage } from '@/i18n/error-message';
import { formatPrice } from '@/i18n/format';
import { useValidationMessage } from '@/i18n/validation';
import { AppError } from '@/lib/errors';
import { useBookInspection } from '../api/inspections.queries';
import type { BookingAccess, BookingHome } from '../booking.schemas';
import { paymentFormSchema, type PaymentFormValues } from '../booking.schemas';
import { useBookingStore, type BookingStep, type HomeChoice } from '../booking.store';
import { useBookingText } from '../hooks/use-booking-text';
import type { PaymentMethod } from '../inspection.types';

const PAYMENT_METHODS = [
  { value: 'card', icon: CreditCardIcon },
  { value: 'apple_pay', icon: SmartphoneIcon },
  { value: 'google_pay', icon: SmartphoneIcon },
] as const satisfies readonly { value: PaymentMethod; icon: LucideIcon }[];

const methodVariants = cva('flex items-start gap-3 rounded-lg border-2 p-3.5 text-left', {
  variants: {
    isSelected: {
      true: 'border-primary bg-surface-highlight',
      false: 'border-border bg-card hover:border-border-strong',
    },
  },
});

type BookingStepReviewProps = {
  user: User;
  home: BookingHome;
  startsAt: string;
  access: BookingAccess;
  choice: HomeChoice | null;
  cityName: string | undefined;
  onEdit: (step: BookingStep) => void;
  onBooked: (inspectionId: string) => void;
};

export function BookingStepReview({
  user,
  home,
  startsAt,
  access,
  choice,
  cityName,
  onEdit,
  onBooked,
}: BookingStepReviewProps) {
  const { t } = useTranslation('inspections');
  const validationMessage = useValidationMessage();
  const text = useBookingText();
  const { name } = useAccountIdentity(user);
  const phone = useQuery(authQueries.accountPhone(user.id));
  const paymentMethod = useBookingStore((state) => state.paymentMethod);
  const setPaymentMethod = useBookingStore((state) => state.setPaymentMethod);
  const markStartTaken = useBookingStore((state) => state.markStartTaken);
  const book = useBookInspection();
  const errorMessage = useErrorMessage();
  const termsId = useId();
  const termsErrorId = useId();
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: { paymentMethod, hasAcceptedTerms: false },
  });

  const rows = [
    { key: 'address', icon: MapPinIcon, value: text.address(home, cityName), step: 2 },
    { key: 'home', icon: HouseIcon, value: text.facts(home), step: 2 },
    { key: 'date', icon: CalendarDaysIcon, value: text.date(startsAt), step: 3 },
    {
      key: 'opener',
      icon: UserIcon,
      value: text.opener(access, name, phone.data ?? undefined),
      step: 4,
    },
  ] as const;

  const handleSubmit = form.handleSubmit((values) => {
    book.mutate(
      {
        propertyId: choice?.kind === 'property' ? choice.propertyId : null,
        listingId:
          choice?.kind === 'property' || choice?.kind === 'listing' ? choice.listingId : null,
        addressText: home.addressText,
        cityId: home.cityId,
        latitude: home.latitude,
        longitude: home.longitude,
        propertyType: home.propertyType,
        areaM2: home.areaM2,
        yearBuilt: home.yearBuilt,
        floor: home.floor,
        buildingFloors: home.buildingFloors,
        startsAt,
        accessMode: access.mode,
        accessName: access.name,
        accessPhone: access.phone,
        accessTags: access.tags,
        accessNotes: access.notes,
        paymentMethod: values.paymentMethod,
      },
      {
        onSuccess: (booked) => {
          onBooked(booked.id);
        },
        onError: (error) => {
          if (error instanceof AppError && error.reason === 'slot_taken') {
            markStartTaken();
            onEdit(3);
          }
        },
      },
    );
  });

  const errorReason = book.error instanceof AppError ? book.error.reason : undefined;

  return (
    <>
      <div className="flex flex-col gap-3.5 rounded-photo border border-card bg-card p-4.5 shadow-card-soft sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <strong className="text-h4">{t('booking.review.title')}</strong>
          <span className="text-small text-muted-foreground">{t('booking.review.hint')}</span>
        </div>
        <div className="flex flex-col">
          {rows.map(({ key, icon: Icon, value, step }) => (
            <div key={key} className="flex items-center gap-3 border-t border-border-subtle py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-step-leaf-surface text-step-leaf-ink">
                <Icon aria-hidden className="size-4.5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-meta text-muted-foreground">
                  {t(`booking.review.rows.${key}`)}
                </span>
                <strong className="text-body-sm first-letter:uppercase">{value}</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  onEdit(step);
                }}
                aria-label={t('booking.review.editLabel', {
                  item: t(`booking.review.rows.${key}`),
                })}
                className="min-h-11 px-1 text-small font-bold text-brand underline underline-offset-4"
              >
                {t('booking.review.edit')}
              </button>
            </div>
          ))}
        </div>
      </div>
      <form
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-4 rounded-photo border border-card bg-card p-4.5 shadow-card-soft sm:p-6"
      >
        <Controller
          name="paymentMethod"
          control={form.control}
          render={({ field }) => (
            <TilePicker
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                setPaymentMethod(value);
              }}
              legend={t('booking.payment.legend')}
              legendClassName="mb-2 font-semibold data-[variant=legend]:text-label"
              fieldSetClassName="gap-2"
              className="grid gap-2 sm:grid-cols-3"
              options={PAYMENT_METHODS.map(({ value, icon: Icon }) => {
                const isSelected = field.value === value;
                return {
                  value,
                  className: methodVariants({ isSelected }),
                  content: (
                    <>
                      <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
                      <span className="flex flex-col">
                        <strong className="text-body-sm">
                          {t(`booking.payment.methods.${value}.label`)}
                        </strong>
                        {value === 'card' ? (
                          <span className="text-caption text-muted-foreground">
                            {t('booking.payment.methods.card.text')}
                          </span>
                        ) : null}
                      </span>
                    </>
                  ),
                };
              })}
            />
          )}
        />
        <Controller
          name="hasAcceptedTerms"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <Checkbox
                id={termsId}
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked === true);
                }}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? termsErrorId : undefined}
                className="mt-px"
              />
              <FieldContent className="gap-1">
                <FieldLabel htmlFor={termsId} className="cursor-pointer text-body-sm font-semibold">
                  {t('booking.payment.terms')}
                </FieldLabel>
                <span className="text-caption text-muted-foreground">
                  {t('booking.payment.termsNote')}
                </span>
                <FieldError id={termsErrorId}>
                  {validationMessage(fieldState.error?.message)}
                </FieldError>
              </FieldContent>
            </Field>
          )}
        />
        {book.isError && errorReason !== 'slot_taken' ? (
          <Alert tone="error">
            <AlertDescription>{errorMessage(book.error)}</AlertDescription>
          </Alert>
        ) : null}
        <Alert tone="info">
          <AlertDescription>{t('booking.payment.notActive')}</AlertDescription>
        </Alert>
        <Button type="submit" variant="cta" size="lg" className="w-full" loading={book.isPending}>
          <LockIcon aria-hidden />
          {book.isPending ? t('booking.payment.booking') : t('booking.payment.submit')}
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-small tabular-nums">
            {formatPrice(SERVICE_PRICES.physical.amount, SERVICE_PRICES.physical.currency)}
          </span>
        </Button>
        <span className="inline-flex items-center justify-center gap-2 text-caption text-muted-foreground">
          <ShieldCheckIcon aria-hidden className="size-4" />
          {t('booking.payment.secure')}
        </span>
      </form>
    </>
  );
}
