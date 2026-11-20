import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import {
  BellRingIcon,
  CarIcon,
  KeyRoundIcon,
  PawPrintIcon,
  PhoneCallIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import { useId } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { authQueries } from '@/features/auth';
import { initialsOf, useAccountIdentity } from '@/features/profile';
import { useValidationMessage } from '@/i18n/validation';
import { cn } from '@/lib/utils';
import {
  ACCESS_NOTES_MAX,
  accessFormSchema,
  toBookingAccess,
  type AccessFormValues,
} from '../booking.schemas';
import { useBookingStore } from '../booking.store';
import { ACCESS_TAGS, type AccessMode, type AccessTag } from '../inspection.types';
import { BookingTextField } from './booking-text-field';

const NAME_AUTOCOMPLETE = 'name';

const OPENERS = [
  { value: 'self', icon: UserIcon },
  { value: 'other', icon: UsersIcon },
] as const satisfies readonly { value: AccessMode; icon: LucideIcon }[];

const TAG_ICONS = {
  intercom: BellRingIcon,
  parking: CarIcon,
  pet: PawPrintIcon,
  key_at_doorman: KeyRoundIcon,
} as const satisfies Record<AccessTag, LucideIcon>;

type BookingStepAccessProps = {
  user: User;
  formId: string;
  onSaved: () => void;
};

export function BookingStepAccess({ user, formId, onSaved }: BookingStepAccessProps) {
  const { t } = useTranslation('inspections');
  const validationMessage = useValidationMessage();
  const { name } = useAccountIdentity(user);
  const phone = useQuery(authQueries.accountPhone(user.id));
  const access = useBookingStore((state) => state.access);
  const saveAccess = useBookingStore((state) => state.saveAccess);
  const notesId = useId();
  const notesHintId = useId();
  const form = useForm<AccessFormValues>({
    resolver: zodResolver(accessFormSchema),
    defaultValues: {
      mode: access?.mode ?? 'self',
      name: access?.name ?? '',
      phone: access?.phone ?? '',
      tags: access?.tags ?? [],
      notes: access?.notes ?? '',
    },
  });
  const mode = useWatch({ control: form.control, name: 'mode' });
  const notes = useWatch({ control: form.control, name: 'notes' });

  const handleSubmit = form.handleSubmit((values) => {
    saveAccess(toBookingAccess(values));
    onSaved();
  });

  return (
    <>
      <form
        id={formId}
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-4.5 rounded-photo border border-card bg-card p-4.5 shadow-card-soft sm:p-6"
      >
        <Controller
          name="mode"
          control={form.control}
          render={({ field }) => (
            <div
              role="radiogroup"
              aria-label={t('booking.access.openerLabel')}
              className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-2.5"
            >
              {OPENERS.map(({ value, icon: Icon }) => {
                const isSelected = field.value === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      field.onChange(value);
                    }}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border-2 p-3.5 text-left hover:border-primary',
                      isSelected ? 'border-primary bg-step-leaf-soft' : 'border-border bg-card',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-full',
                        isSelected
                          ? 'bg-primary text-cta'
                          : 'bg-step-leaf-surface text-step-leaf-ink',
                      )}
                    >
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <span className="flex flex-col">
                      <strong className="text-body">
                        {t(`booking.access.opener.${value}.title`)}
                      </strong>
                      <span className="text-small text-muted-foreground">
                        {t(`booking.access.opener.${value}.text`)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        />
        {mode === 'self' ? (
          <div className="flex items-center gap-3 rounded-lg bg-background px-3.5 py-3">
            <span
              aria-hidden
              className="grid size-10 place-items-center rounded-full bg-primary text-small font-extrabold text-primary-foreground"
            >
              {initialsOf(name)}
            </span>
            <div className="flex flex-1 flex-col">
              <strong className="text-body-sm">{name}</strong>
              <span className="text-small text-muted-foreground tabular-nums">
                {t('booking.access.fromAccount', { phone: phone.data ?? '' })}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-3.5">
            <BookingTextField
              control={form.control}
              name="name"
              label={t('booking.access.name')}
              autoComplete={NAME_AUTOCOMPLETE}
            />
            <BookingTextField
              control={form.control}
              name="phone"
              label={t('booking.access.phone')}
              type="tel"
              inputMode="tel"
              placeholder={t('booking.access.phonePlaceholder')}
            />
          </div>
        )}
        <div className="flex flex-col gap-2.5 border-t border-border-subtle pt-1">
          <div className="flex flex-col gap-0.5 pt-3.5">
            <strong className="text-body">{t('booking.access.notesTitle')}</strong>
            <span className="text-small text-muted-foreground">
              {t('booking.access.notesText')}
            </span>
          </div>
          <Controller
            name="tags"
            control={form.control}
            render={({ field }) => (
              <div
                role="group"
                aria-label={t('booking.access.tagsLabel')}
                className="flex flex-wrap gap-2"
              >
                {ACCESS_TAGS.map((tag) => {
                  const Icon = TAG_ICONS[tag];
                  const isOn = field.value.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={isOn}
                      onClick={() => {
                        field.onChange(
                          isOn
                            ? field.value.filter((value) => value !== tag)
                            : [...field.value, tag],
                        );
                      }}
                      className={cn(
                        'touch-target inline-flex min-h-10 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-small font-bold',
                        isOn
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-brand hover:border-primary',
                      )}
                    >
                      <Icon aria-hidden className="size-4" />
                      {t(`accessTag.${tag}`)}
                    </button>
                  );
                })}
              </div>
            )}
          />
          <Controller
            name="notes"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={notesId} className="sr-only">
                  {t('booking.access.notesTitle')}
                </FieldLabel>
                <Textarea
                  {...field}
                  id={notesId}
                  maxLength={ACCESS_NOTES_MAX}
                  placeholder={t('booking.access.notesPlaceholder')}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={notesHintId}
                />
                <FieldDescription id={notesHintId}>
                  {t('booking.access.notesCount', { count: notes.length, max: ACCESS_NOTES_MAX })}
                </FieldDescription>
                <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
              </Field>
            )}
          />
        </div>
      </form>
      <div className="flex items-start gap-3 rounded-lg bg-step-sky-soft px-4 py-3.5 text-body-sm text-step-sky-ink">
        <PhoneCallIcon aria-hidden className="size-5 shrink-0" />
        <span>{t('booking.access.callNote')}</span>
      </div>
    </>
  );
}
