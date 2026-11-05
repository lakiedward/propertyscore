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
import { useErrorMessage } from '@/i18n/error-message';
import { isAppError } from '@/lib/errors';
import { applyServerErrors } from '@/lib/forms';
import { useDeleteOwnAccount } from '../api/auth.queries';
import { deleteAccountFormSchema, type DeleteAccountFormValues } from '../auth.schemas';
import { AuthNotice } from './auth-notice';
import { SettingsSection } from './settings-section';
import { SettingsTextField } from './settings-text-field';

type DeleteAccountSectionProps = {
  email: string;
  hasPassword: boolean;
};

export function DeleteAccountSection({ email, hasPassword }: DeleteAccountSectionProps) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const deleteAccount = useDeleteOwnAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [formError, setFormError] = useState<unknown>();
  const form = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountFormSchema(hasPassword)),
    defaultValues: { confirmation: '' },
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      form.reset();
      setFormError(undefined);
    }
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      await deleteAccount.mutateAsync(values.confirmation);
      toast.success(t('settings.delete.deleted'));
      await navigate({ to: '/' });
    } catch (error) {
      if (!applyServerErrors(form, error)) {
        setFormError(error);
      }
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
          {formError ? (
            <AuthNotice tone="error" title={t('settings.delete.failedTitle')}>
              {isAppError(formError) && formError.reason
                ? errorMessage(formError)
                : t('settings.delete.failedText')}
            </AuthNotice>
          ) : null}
          <form onSubmit={(event) => void handleSubmit(event)} noValidate>
            <FieldGroup className="gap-4">
              <Controller
                name="confirmation"
                control={form.control}
                render={({ field, fieldState }) => (
                  <SettingsTextField
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
