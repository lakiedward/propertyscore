import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { SettingsSection } from '@/components/layout/settings-section';
import { useUpdateAccountPhone } from '../api/auth.queries';
import { useAuth } from '../auth-context';
import { accountPhoneFormSchema, type AccountPhoneFormValues } from '../auth.schemas';
import { postSignInPath, toE164Phone } from '../auth.utils';
import { useFormError } from '../hooks/use-form-error';
import { AuthNotice } from './auth-notice';
import { AuthTextField } from './auth-text-field';
import { FormErrorNotice } from './form-error-notice';

type PhoneSectionProps = {
  userId: string;
  phone: string | null;
  redirect: string | undefined;
};

export function PhoneSection({ userId, phone, redirect }: PhoneSectionProps) {
  const { t } = useTranslation('auth');
  const { roles } = useAuth();
  const navigate = useNavigate();
  const updatePhone = useUpdateAccountPhone();
  const isProfileIncomplete = phone === null;
  const form = useForm<AccountPhoneFormValues>({
    resolver: zodResolver(accountPhoneFormSchema),
    defaultValues: { phone: phone ?? '' },
  });
  const formError = useFormError(form);

  const handleSubmit = form.handleSubmit(async (values) => {
    formError.clear();
    try {
      const saved = await updatePhone.mutateAsync({ userId, phone: toE164Phone(values.phone) });
      form.reset({ phone: saved ?? '' });
      if (isProfileIncomplete) {
        toast.success(t('settings.phone.completed'));
        await navigate({ href: postSignInPath(roles, redirect) });
        return;
      }
      toast.success(t('settings.phone.saved'));
    } catch (error) {
      formError.handle(error);
    }
  });

  return (
    <SettingsSection title={t('settings.phone.title')} description={t('settings.phone.text')}>
      {isProfileIncomplete ? (
        <AuthNotice tone="warning" title={t('settings.phone.missingTitle')}>
          {t('settings.phone.missingText')}
        </AuthNotice>
      ) : null}
      {formError.error ? (
        <FormErrorNotice
          error={formError.error}
          title={t('settings.phone.failedTitle')}
          fallback={t('settings.phone.failedText')}
        />
      ) : null}
      <form onSubmit={(event) => void handleSubmit(event)} noValidate className="max-w-md">
        <FieldGroup className="gap-4">
          <Controller
            name="phone"
            control={form.control}
            render={({ field, fieldState }) => (
              <AuthTextField
                look="settings"
                {...field}
                label={t('fields.phone.label')}
                hint={t('settings.phone.hint')}
                error={fieldState.error?.message}
                type="tel"
                autoComplete="tel"
                inputMode="tel"
              />
            )}
          />
          <Button type="submit" disabled={updatePhone.isPending} className="self-start">
            {updatePhone.isPending ? t('settings.phone.pending') : t('settings.phone.submit')}
          </Button>
        </FieldGroup>
      </form>
    </SettingsSection>
  );
}
