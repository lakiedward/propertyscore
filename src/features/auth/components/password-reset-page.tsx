import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { TextLink } from '@/components/navigation/text-link';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { useErrorMessage } from '@/i18n/error-message';
import { isAppError } from '@/lib/errors';
import { useRequestPasswordReset } from '../api/auth.queries';
import { passwordResetRequestSchema, type PasswordResetRequestValues } from '../auth.schemas';
import { AuthNotice } from './auth-notice';
import { AuthPageHeading } from './auth-page-heading';
import { AuthStatusCard } from './auth-status-card';
import { AuthTextField } from './auth-text-field';

export function PasswordResetPage() {
  const { t } = useTranslation('auth');
  const errorMessage = useErrorMessage();
  const requestReset = useRequestPasswordReset();
  const [sentTo, setSentTo] = useState<string>();
  const form = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: '' },
  });

  const handleSubmit = form.handleSubmit((values) => {
    requestReset.mutate(values.email, {
      onSuccess: () => {
        setSentTo(values.email);
      },
    });
  });

  if (sentTo) {
    return (
      <AuthStatusCard
        eyebrow={t('passwordReset.sent.eyebrow')}
        title={t('passwordReset.sent.title')}
        actions={
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              requestReset.reset();
              setSentTo(undefined);
            }}
            className="h-11 border-[1.5px] px-4.5 text-body font-bold"
          >
            {t('passwordReset.sent.otherEmail')}
          </Button>
        }
      >
        <p className="text-body text-muted-foreground">
          <Trans
            t={t}
            i18nKey="passwordReset.sent.text"
            values={{ email: sentTo }}
            components={{ strong: <strong className="font-bold text-foreground" /> }}
          />
        </p>
        <AuthNotice tone="info">{t('passwordReset.sent.spam')}</AuthNotice>
      </AuthStatusCard>
    );
  }

  return (
    <>
      <AuthPageHeading title={t('passwordReset.title')}>{t('passwordReset.text')}</AuthPageHeading>
      {requestReset.error ? (
        <AuthNotice tone="error" title={t('passwordReset.failedTitle')}>
          {isAppError(requestReset.error) && requestReset.error.reason
            ? errorMessage(requestReset.error)
            : t('passwordReset.failedText')}
        </AuthNotice>
      ) : null}
      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <FieldGroup className="gap-3">
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <AuthTextField
                {...field}
                label={t('fields.email.label')}
                error={fieldState.error?.message}
                type="email"
                autoComplete="email"
                inputMode="email"
              />
            )}
          />
          <Button type="submit" size="xl" disabled={requestReset.isPending} className="mt-1 w-full">
            {requestReset.isPending ? t('passwordReset.pending') : t('passwordReset.submit')}
          </Button>
        </FieldGroup>
      </form>
      <TextLink to="/login" className="inline-flex items-center gap-1.5 self-start py-1">
        <ArrowLeftIcon aria-hidden className="size-4" />
        {t('passwordReset.backToLogin')}
      </TextLink>
    </>
  );
}
