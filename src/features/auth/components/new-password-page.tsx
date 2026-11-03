import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { TextLink } from '@/components/navigation/text-link';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { useErrorMessage } from '@/i18n/error-message';
import { isAppError } from '@/lib/errors';
import { applyServerErrors } from '@/lib/forms';
import { useUpdatePassword } from '../api/auth.queries';
import { useAuth } from '../auth-context';
import {
  newPasswordFormSchema,
  PASSWORD_MIN_LENGTH,
  type NewPasswordFormValues,
} from '../auth.schemas';
import { homePathFor } from '../auth.utils';
import { AuthNotice } from './auth-notice';
import { AuthPageHeading } from './auth-page-heading';
import { AuthTextField } from './auth-text-field';

export function NewPasswordPage() {
  const { t } = useTranslation('auth');
  const { session, roles } = useAuth();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const updatePassword = useUpdatePassword();
  const [formError, setFormError] = useState<unknown>();
  const form = useForm<NewPasswordFormValues>({
    resolver: zodResolver(newPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      await updatePassword.mutateAsync(values.password);
      toast.success(t('newPassword.saved'));
      await navigate({ href: homePathFor(roles) });
    } catch (error) {
      if (!applyServerErrors(form, error)) {
        setFormError(error);
      }
    }
  });

  if (!session) {
    return (
      <>
        <AuthPageHeading title={t('newPassword.title')} />
        <AuthNotice tone="warning" title={t('newPassword.expired.title')}>
          {t('newPassword.expired.text')}
        </AuthNotice>
        <TextLink to="/password-reset" className="self-start py-1">
          {t('newPassword.expired.action')}
        </TextLink>
      </>
    );
  }

  return (
    <>
      <AuthPageHeading title={t('newPassword.title')}>{t('newPassword.text')}</AuthPageHeading>
      {formError ? (
        <AuthNotice tone="error" title={t('newPassword.failedTitle')}>
          {isAppError(formError) && formError.reason
            ? errorMessage(formError)
            : t('newPassword.failedText')}
        </AuthNotice>
      ) : null}
      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <FieldGroup className="gap-3">
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <AuthTextField
                {...field}
                label={t('newPassword.password')}
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
              <AuthTextField
                {...field}
                label={t('newPassword.confirm')}
                error={fieldState.error?.message}
                type="password"
                autoComplete="new-password"
              />
            )}
          />
          <Button
            type="submit"
            size="xl"
            disabled={updatePassword.isPending}
            className="mt-1 w-full"
          >
            {updatePassword.isPending ? t('newPassword.pending') : t('newPassword.submit')}
          </Button>
        </FieldGroup>
      </form>
    </>
  );
}
