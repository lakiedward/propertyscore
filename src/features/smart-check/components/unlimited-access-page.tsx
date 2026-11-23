import { zodResolver } from '@hookform/resolvers/zod';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SettingsSection } from '@/components/layout/settings-section';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useErrorMessage } from '@/i18n/error-message';
import { formatDate } from '@/i18n/format';
import { useValidationMessage } from '@/i18n/validation';
import { applyServerErrors } from '@/lib/forms';
import { useSetSmartCheckUnlimited, unlimitedAccessQueries } from '../api/unlimited-access.queries';
import {
  unlimitedAccessFormSchema,
  type UnlimitedAccessFormValues,
} from '../unlimited-access.schemas';

export function UnlimitedAccessPage() {
  const { t } = useTranslation('smartCheck');
  const errorMessage = useErrorMessage();
  const validationMessage = useValidationMessage();
  const emailId = useId();
  const accounts = useSuspenseQuery(unlimitedAccessQueries.list());
  const setUnlimited = useSetSmartCheckUnlimited();
  const [formError, setFormError] = useState<unknown>();
  const [removingEmail, setRemovingEmail] = useState<string>();
  const [listError, setListError] = useState<unknown>();
  const form = useForm<UnlimitedAccessFormValues>({
    resolver: zodResolver(unlimitedAccessFormSchema),
    defaultValues: { email: '' },
  });

  const handleSubmit = form.handleSubmit(async ({ email }) => {
    setFormError(undefined);
    try {
      await setUnlimited.mutateAsync({ email, isUnlimited: true });
      form.reset({ email: '' });
      toast.success(t('admin.unlimited.granted', { email }));
    } catch (error) {
      if (!applyServerErrors(form, error)) {
        setFormError(error);
      }
    }
  });

  const handleRemove = async (email: string) => {
    setListError(undefined);
    setRemovingEmail(email);
    try {
      await setUnlimited.mutateAsync({ email, isUnlimited: false });
      toast.success(t('admin.unlimited.revoked', { email }));
    } catch (error) {
      setListError(error);
    } finally {
      setRemovingEmail(undefined);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SettingsSection
        title={t('admin.unlimited.grant.title')}
        description={t('admin.unlimited.grant.text')}
      >
        {formError ? (
          <Alert tone="error">
            <AlertDescription>{errorMessage(formError)}</AlertDescription>
          </Alert>
        ) : null}
        <form
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
          className="flex flex-col gap-4 md:max-w-xl"
        >
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1.5">
                <FieldLabel htmlFor={emailId} className="text-label text-foreground">
                  {t('admin.unlimited.grant.label')}
                </FieldLabel>
                <Input
                  {...field}
                  id={emailId}
                  type="email"
                  autoComplete="off"
                  inputMode="email"
                  aria-invalid={fieldState.invalid}
                  className="h-control rounded-md border-border bg-card px-(--control-padding-x) text-(length:--control-font-size) md:text-(length:--control-font-size)"
                />
                <FieldError className="text-caption leading-copy">
                  {validationMessage(fieldState.error?.message)}
                </FieldError>
              </Field>
            )}
          />
          <Button type="submit" disabled={setUnlimited.isPending} className="self-start">
            {t('admin.unlimited.grant.submit')}
          </Button>
        </form>
      </SettingsSection>
      <SettingsSection
        title={t('admin.unlimited.list.title')}
        description={t('admin.unlimited.list.text')}
      >
        {listError ? (
          <Alert tone="error">
            <AlertDescription>{errorMessage(listError)}</AlertDescription>
          </Alert>
        ) : null}
        {accounts.data.length > 0 ? (
          <ul aria-label={t('admin.unlimited.list.title')} className="flex flex-col gap-3">
            {accounts.data.map((account) => (
              <li
                key={account.user_id}
                className="flex flex-col gap-3 rounded-lg border border-card bg-surface-subtle p-4 w560:flex-row w560:items-center w560:justify-between"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-bold text-foreground">{account.email}</span>
                  <span className="text-caption text-muted-foreground">
                    {account.full_name
                      ? t('admin.unlimited.list.metaNamed', {
                          name: account.full_name,
                          date: formatDate(account.granted_at),
                        })
                      : t('admin.unlimited.list.meta', { date: formatDate(account.granted_at) })}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={removingEmail === account.email}
                  aria-label={t('admin.unlimited.list.removeFor', { email: account.email })}
                  onClick={() => void handleRemove(account.email)}
                >
                  {t('admin.unlimited.list.remove')}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-muted-foreground">{t('admin.unlimited.list.empty')}</p>
        )}
      </SettingsSection>
    </div>
  );
}
