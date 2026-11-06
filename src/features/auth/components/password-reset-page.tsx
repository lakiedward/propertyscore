import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { useRequestPasswordReset } from '../api/auth.queries';
import { passwordResetRequestSchema, type PasswordResetRequestValues } from '../auth.schemas';
import { useCaptcha } from '../hooks/use-captcha';
import { ArrowLink } from './arrow-link';
import { AuthNotice } from './auth-notice';
import { AuthPageHeading } from './auth-page-heading';
import { AuthTextField } from './auth-text-field';
import { CaptchaField } from './captcha-field';
import { CheckInboxCard } from './check-inbox-card';
import { FormErrorNotice } from './form-error-notice';

export function PasswordResetPage() {
  const { t } = useTranslation('auth');
  const requestReset = useRequestPasswordReset();
  const [sentTo, setSentTo] = useState<string>();
  const captcha = useCaptcha();
  const form = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: '' },
  });

  const handleSubmit = form.handleSubmit((values) => {
    const captchaResult = captcha.consume();
    if (!captchaResult) {
      return;
    }
    requestReset.mutate(
      { email: values.email, captchaToken: captchaResult.token },
      {
        onSuccess: () => {
          setSentTo(values.email);
        },
      },
    );
  });

  if (sentTo) {
    return (
      <CheckInboxCard
        eyebrow={t('passwordReset.sent.eyebrow')}
        title={t('passwordReset.sent.title')}
        textKey="passwordReset.sent.text"
        email={sentTo}
        onResend={async (captchaToken) => {
          await requestReset.mutateAsync({ email: sentTo, captchaToken });
        }}
        onUseOtherEmail={() => {
          requestReset.reset();
          setSentTo(undefined);
        }}
      >
        <AuthNotice tone="info">{t('passwordReset.sent.spam')}</AuthNotice>
      </CheckInboxCard>
    );
  }

  return (
    <>
      <AuthPageHeading title={t('passwordReset.title')}>{t('passwordReset.text')}</AuthPageHeading>
      {requestReset.error ? (
        <FormErrorNotice
          error={requestReset.error}
          title={t('passwordReset.failedTitle')}
          fallback={t('passwordReset.failedText')}
        />
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
          <CaptchaField captcha={captcha} />
          <Button type="submit" size="xl" disabled={requestReset.isPending} className="mt-1 w-full">
            {requestReset.isPending ? t('passwordReset.pending') : t('passwordReset.submit')}
          </Button>
        </FieldGroup>
      </form>
      <ArrowLink to="/login" direction="back">
        {t('passwordReset.backToLogin')}
      </ArrowLink>
    </>
  );
}
