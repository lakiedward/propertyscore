import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { isAppError } from '@/lib/errors';
import { useDeleteOwnAccount } from '../api/auth.queries';
import { deleteAccountFormSchema, type DeleteAccountFormValues } from '../auth.schemas';
import { useFormError } from '../hooks/use-form-error';
import { useSocialSignIn } from '../hooks/use-social-sign-in';
import { AuthTextField } from './auth-text-field';
import { FormErrorNotice } from './form-error-notice';
import { SettingsSection } from './settings-section';
import { SocialSignInNotice } from './social-sign-in-notice';

const SETTINGS_PATH = '/account/settings';
const REAUTHENTICATION_PROVIDER = 'google';

type DeleteAccountSectionProps = {
  email: string;
  hasPassword: boolean;
};

export function DeleteAccountSection({ email, hasPassword }: DeleteAccountSectionProps) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const deleteAccount = useDeleteOwnAccount();
  const social = useSocialSignIn(SETTINGS_PATH);
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountFormSchema(hasPassword)),
    defaultValues: { confirmation: '' },
  });
  const formError = useFormError(form);
  const needsReauthentication =
    isAppError(formError.error) && formError.error.reason === 'reauthentication_needed';

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      form.reset();
      formError.clear();
      social.clearNotice();
    }
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    formError.clear();
    social.clearNotice();
    try {
      await deleteAccount.mutateAsync(values.confirmation);
      toast.success(t('settings.delete.deleted'));
      await navigate({ to: '/' });
    } catch (error) {
      formError.handle(error);
    }
  });

  return (
    <SettingsSection
      title={t('settings.delete.title')}
      description={t('settings.delete.text')}
      tone="danger"
    >
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="self-start">
            <Trash2Icon aria-hidden />
            {t('settings.delete.open')}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.delete.dialogTitle')}</DialogTitle>
            <DialogDescription>
              {hasPassword
                ? t('settings.delete.passwordText', { email })
                : t('settings.delete.emailText', { email })}
            </DialogDescription>
          </DialogHeader>
          {social.notice ? <SocialSignInNotice notice={social.notice} /> : null}
          {formError.error ? (
            <FormErrorNotice
              error={formError.error}
              title={t('settings.delete.failedTitle')}
              fallback={t('settings.delete.failedText')}
            />
          ) : null}
          {needsReauthentication ? (
            <Button
              type="button"
              variant="outline"
              aria-busy={social.pendingProvider !== undefined}
              disabled={social.pendingProvider !== undefined}
              onClick={() => void social.select(REAUTHENTICATION_PROVIDER)}
              className="self-start"
            >
              {t('settings.delete.reauthAction', {
                provider: t(`social.providers.${REAUTHENTICATION_PROVIDER}`),
              })}
            </Button>
          ) : null}
          <form onSubmit={(event) => void handleSubmit(event)} noValidate>
            <FieldGroup className="gap-4">
              <Controller
                name="confirmation"
                control={form.control}
                render={({ field, fieldState }) => (
                  <AuthTextField
                    look="settings"
                    {...field}
                    label={hasPassword ? t('settings.delete.password') : t('settings.delete.email')}
                    error={fieldState.error?.message}
                    type={hasPassword ? 'password' : 'email'}
                    autoComplete={hasPassword ? 'current-password' : 'off'}
                  />
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {t('settings.delete.cancel')}
                  </Button>
                </DialogClose>
                <Button type="submit" variant="destructive" disabled={deleteAccount.isPending}>
                  {deleteAccount.isPending
                    ? t('settings.delete.pending')
                    : t('settings.delete.submit')}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
