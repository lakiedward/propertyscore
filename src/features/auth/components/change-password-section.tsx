import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { useErrorMessage } from '@/i18n/error-message';
import { isAppError } from '@/lib/errors';
import { applyServerErrors } from '@/lib/forms';
import { useChangePassword } from '../api/auth.queries';
import {
  changePasswordFormSchema,
  PASSWORD_MIN_LENGTH,
  type ChangePasswordFormValues,
} from '../auth.schemas';
import { AuthNotice } from './auth-notice';
import { SettingsSection } from './settings-section';
import { SettingsTextField } from './settings-text-field';

type ChangePasswordSectionProps = {
  hasPassword: boolean;
};

export function ChangePasswordSection({ hasPassword }: ChangePasswordSectionProps) {
  const { t } = useTranslation('auth');
  const errorMessage = useErrorMessage();
  const changePassword = useChangePassword();
  const [formError, setFormError] = useState<unknown>();
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema(hasPassword)),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      await changePassword.mutateAsync({
        currentPassword: hasPassword ? values.currentPassword : undefined,
        password: values.password,
      });
      form.reset();
      toast.success(t('settings.password.saved'));
    } catch (error) {
      if (!applyServerErrors(form, error)) {
        setFormError(error);
      }
    }
  });

  return (
    <SettingsSection
      title={hasPassword ? t('settings.password.title') : t('settings.password.setTitle')}
      description={hasPassword ? t('settings.password.text') : t('settings.password.setText')}
    >
      {formError ? (
        <AuthNotice tone="error" title={t('settings.password.failedTitle')}>
          {isAppError(formError) && formError.reason
            ? errorMessage(formError)
            : t('settings.password.failedText')}
        </AuthNotice>
      ) : null}
      <form onSubmit={(event) => void handleSubmit(event)} noValidate className="max-w-md">
        <FieldGroup className="gap-4">
          {hasPassword ? (
            <Controller
              name="currentPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <SettingsTextField
                  {...field}
                  label={t('settings.password.current')}
                  error={fieldState.error?.message}
                  type="password"
                  autoComplete="current-password"
                />
              )}
            />
          ) : null}
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <SettingsTextField
                {...field}
                label={t('settings.password.new')}
                hint={t('settings.password.hint')}
                error={fieldState.error?.message}
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
              />
            )}
          />
          <Controller
            name="confirmPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <SettingsTextField
                {...field}
                label={t('settings.password.confirm')}
                error={fieldState.error?.message}
                type="password"
                autoComplete="new-password"
              />
            )}
          />
          <Button type="submit" disabled={changePassword.isPending} className="self-start">
            {changePassword.isPending
              ? t('settings.password.pending')
              : hasPassword
                ? t('settings.password.submit')
                : t('settings.password.setSubmit')}
          </Button>
        </FieldGroup>
      </form>
    </SettingsSection>
  );
}
