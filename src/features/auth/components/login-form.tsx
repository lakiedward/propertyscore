import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { useErrorMessage } from '@/i18n/error-message';
import { isAppError } from '@/lib/errors';
import { useSignIn } from '../api/auth.queries';
import { credentialsSchema, type Credentials } from '../auth.schemas';
import type { SocialProvider } from '../auth.types';
import { AuthNotice } from './auth-notice';
import { AuthTextField } from './auth-text-field';
import { SocialSignIn } from './social-sign-in';
import { SocialUnavailableNotice } from './social-unavailable-notice';

export function LoginForm() {
  const { t } = useTranslation('auth');
  const errorMessage = useErrorMessage();
  const signIn = useSignIn();
  const [oauthProvider, setOauthProvider] = useState<SocialProvider>();
  const form = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSubmit = form.handleSubmit((values) => {
    setOauthProvider(undefined);
    signIn.mutate(values);
  });

  const handleSocialSelect = (provider: SocialProvider) => {
    signIn.reset();
    setOauthProvider(provider);
  };

  const reason = isAppError(signIn.error) ? signIn.error.reason : undefined;
  const isUnconfirmed = reason === 'email_not_confirmed';

  return (
    <>
      {oauthProvider ? <SocialUnavailableNotice provider={oauthProvider} /> : null}
      {signIn.error && isUnconfirmed ? (
        <AuthNotice tone="warning" title={t('login.unconfirmedTitle')}>
          {t('login.unconfirmedText', { email: signIn.variables.email })}
        </AuthNotice>
      ) : null}
      {signIn.error && !isUnconfirmed ? (
        <AuthNotice tone="error" title={t('login.failedTitle')}>
          {reason === 'invalid_credentials' ? t('login.failedText') : errorMessage(signIn.error)}
        </AuthNotice>
      ) : null}
      <SocialSignIn onSelect={handleSocialSelect} />
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
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <AuthTextField
                {...field}
                label={t('fields.password.label')}
                error={fieldState.error?.message}
                type="password"
                autoComplete="current-password"
              />
            )}
          />
          <Button type="submit" size="xl" disabled={signIn.isPending} className="mt-1 w-full">
            {signIn.isPending ? t('login.pending') : t('login.submit')}
          </Button>
        </FieldGroup>
      </form>
    </>
  );
}
