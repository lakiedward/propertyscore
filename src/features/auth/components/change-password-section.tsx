import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { SettingsSection } from '@/components/layout/settings-section';
import { useChangePassword } from '../api/auth.queries';
import {
  changePasswordFormSchema,
  PASSWORD_MIN_LENGTH,
  type ChangePasswordFormValues,
} from '../auth.schemas';
import { useFormError } from '../hooks/use-form-error';
import { AuthTextField } from './auth-text-field';
import { FormErrorNotice } from './form-error-notice';

type ChangePasswordSectionProps = {
  hasPassword: boolean;
};

export function ChangePasswordSection({ hasPassword }: ChangePasswordSectionProps) {
  const { t } = useTranslation('auth');
  const changePassword = useChangePassword();
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema(hasPassword)),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });
  const formError = useFormError(form);

  const handleSubmit = form.handleSubmit(async (values) => {
    formError.clear();
    try {
      await changePassword.mutateAsync({
        currentPassword: hasPassword ? values.currentPassword : undefined,
        password: values.password,
      });
      form.reset();
      toast.success(t('settings.password.saved'));
    } catch (error) {
      formError.handle(error);
    }
  });

  return (
    <SettingsSection
      title={hasPassword ? t('settings.password.title') : t('settings.password.setTitle')}
      description={hasPassword ? t('settings.password.text') : t('settings.password.setText')}
    >
      {formError.error ? (
        <FormErrorNotice
          error={formError.error}
          title={t('settings.password.failedTitle')}
          fallback={t('settings.password.failedText')}
        />
      ) : null}
      <form onSubmit={(event) => void handleSubmit(event)} noValidate className="w-full">
        <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {hasPassword ? (
            <Controller
              name="currentPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <AuthTextField
                  look="settings"
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
              <AuthTextField
                look="settings"
                {...field}
                label={t('settings.password.new')}
                hint={t('settings.password.hint', { count: PASSWORD_MIN_LENGTH })}
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
                look="settings"
                {...field}
                label={t('settings.password.confirm')}
                error={fieldState.error?.message}
                type="password"
                autoComplete="new-password"
              />
            )}
          />
          <Button
            type="submit"
            disabled={changePassword.isPending}
            className="justify-self-start md:col-span-2 xl:col-span-3"
          >
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
