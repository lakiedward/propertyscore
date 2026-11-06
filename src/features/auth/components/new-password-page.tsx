import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { TextLink } from '@/components/navigation/text-link';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { useChangePassword } from '../api/auth.queries';
import { useAuth } from '../auth-context';
import {
  newPasswordFormSchema,
  PASSWORD_MIN_LENGTH,
  type NewPasswordFormValues,
} from '../auth.schemas';
import { homePathFor } from '../auth.utils';
import { useFormError } from '../hooks/use-form-error';
import { AuthNotice } from './auth-notice';
import { AuthPageHeading } from './auth-page-heading';
import { AuthTextField } from './auth-text-field';
import { FormErrorNotice } from './form-error-notice';

export function NewPasswordPage() {
  const { t } = useTranslation('auth');
  const { session, roles } = useAuth();
  const navigate = useNavigate();
  const changePassword = useChangePassword();
  const form = useForm<NewPasswordFormValues>({
    resolver: zodResolver(newPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const formError = useFormError(form);

  const handleSubmit = form.handleSubmit(async (values) => {
    formError.clear();
    try {
      await changePassword.mutateAsync({ currentPassword: undefined, password: values.password });
      toast.success(t('newPassword.saved'));
      await navigate({ to: homePathFor(roles) });
    } catch (error) {
      formError.handle(error);
    }
  });

  if (!session) {
    return (
      <>
        <AuthPageHeading title={t('newPassword.title')} />
        <AuthNotice tone="warning" title={t('newPassword.expired.title')}>
          {t('newPassword.expired.text')}
        </AuthNotice>
        <TextLink to="/password-reset" className="touch-target self-start py-1">
          {t('newPassword.expired.action')}
        </TextLink>
      </>
    );
  }

  return (
    <>
      <AuthPageHeading title={t('newPassword.title')}>{t('newPassword.text')}</AuthPageHeading>
      {formError.error ? (
        <FormErrorNotice
          error={formError.error}
          title={t('newPassword.failedTitle')}
          fallback={t('newPassword.failedText')}
        />
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
            disabled={changePassword.isPending}
            className="mt-1 w-full"
          >
            {changePassword.isPending ? t('newPassword.pending') : t('newPassword.submit')}
          </Button>
        </FieldGroup>
      </form>
    </>
  );
}
