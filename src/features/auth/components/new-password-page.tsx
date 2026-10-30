import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useValidationMessage } from '@/i18n/validation';
import { Button } from '@/components/ui/button';
import { useAuth } from '../auth-context';
import { newPasswordSchema, type NewPasswordValues } from '../auth.schemas';
import { AuthPageHeading } from './auth-page-heading';
import { AuthStatusCard } from './auth-status-card';
import { AuthTextField } from './auth-text-field';

export function NewPasswordPage() {
  const { t } = useTranslation('auth');
  const { user } = useAuth();
  const validationMessage = useValidationMessage();
  const [isDone, setIsDone] = useState(false);
  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', repeat: '' },
  });

  const handleSubmit = form.handleSubmit(() => {
    setIsDone(true);
  });

  if (isDone) {
    return (
      <AuthStatusCard
        tone="success"
        eyebrow={t('newPassword.done.eyebrow')}
        title={t('newPassword.done.title')}
        actions={
          <Button asChild className="h-11 gap-2.5 px-4.5 text-body font-bold">
            <Link to="/login">
              {t('newPassword.done.signIn')}
              <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
        }
      >
        <p className="text-body text-muted-foreground">{t('newPassword.done.text')}</p>
      </AuthStatusCard>
    );
  }

  return (
    <>
      <AuthPageHeading title={t('newPassword.title')}>
        {user?.email ? t('newPassword.forAccount', { email: user.email }) : null}
      </AuthPageHeading>
      <form
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-3.5"
      >
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <AuthTextField
              {...field}
              label={t('newPassword.password')}
              hint={t('newPassword.hint')}
              type="password"
              autoComplete="new-password"
              error={
                fieldState.error?.type === 'too_big'
                  ? validationMessage(fieldState.error.message)
                  : fieldState.invalid
                    ? t('fields.password.tooShort')
                    : undefined
              }
            />
          )}
        />
        <Controller
          name="repeat"
          control={form.control}
          render={({ field, fieldState }) => (
            <AuthTextField
              {...field}
              label={t('newPassword.repeat')}
              type="password"
              autoComplete="new-password"
              error={fieldState.invalid ? t('newPassword.mismatch') : undefined}
            />
          )}
        />
        <Button type="submit" size="lg" className="w-full text-lead-sm leading-[1.2] font-bold">
          {t('newPassword.submit')}
        </Button>
      </form>
    </>
  );
}
