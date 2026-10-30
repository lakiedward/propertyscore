import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { passwordResetSchema, type PasswordResetValues } from '../auth.schemas';
import { AuthPageHeading } from './auth-page-heading';
import { AuthStatusCard } from './auth-status-card';
import { AuthTextField } from './auth-text-field';

export function PasswordResetPage() {
  const { t } = useTranslation('auth');
  const [sentTo, setSentTo] = useState<string>();
  const form = useForm<PasswordResetValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { email: '' },
  });

  const handleSubmit = form.handleSubmit((values) => {
    setSentTo(values.email);
  });

  if (sentTo) {
    return (
      <AuthStatusCard
        eyebrow={t('passwordReset.sent.eyebrow')}
        title={t('passwordReset.sent.title')}
        actions={
          <Button
            asChild
            variant="outline"
            className="h-12.5 border-border-control bg-transparent px-5 text-small font-[730]"
          >
            <Link to="/login">{t('passwordReset.sent.otherEmail')}</Link>
          </Button>
        }
      >
        <p className="text-body text-muted-foreground">
          {t('passwordReset.sent.text', { email: sentTo })}
        </p>
      </AuthStatusCard>
    );
  }

  return (
    <>
      <AuthPageHeading title={t('passwordReset.title')}>{t('passwordReset.text')}</AuthPageHeading>
      <form
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-3.5"
      >
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <AuthTextField
              {...field}
              label={t('fields.email.label')}
              type="email"
              autoComplete="email"
              error={fieldState.invalid ? t('fields.email.error') : undefined}
            />
          )}
        />
        <Button type="submit" className="h-13 w-full gap-2.75 rounded-md text-[15px] font-[730]">
          {t('passwordReset.submit')}
          <span aria-hidden="true">→</span>
        </Button>
      </form>
      <Link
        to="/login"
        className="self-start rounded-sm py-1 text-small font-[670] text-brand underline underline-offset-3 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span aria-hidden="true">← </span>
        {t('passwordReset.backToLogin')}
      </Link>
    </>
  );
}
