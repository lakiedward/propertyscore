import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TextLink } from '@/components/navigation/text-link';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { useErrorMessage } from '@/i18n/error-message';
import { isAppError } from '@/lib/errors';
import { useSignIn } from '../api/auth.queries';
import { credentialsSchema, type Credentials } from '../auth.schemas';
import type { SocialProvider } from '../auth.types';
import { useSocialSignIn } from '../hooks/use-social-sign-in';
import { AuthNotice } from './auth-notice';
import { AuthTextField } from './auth-text-field';
import { SocialSignIn } from './social-sign-in';
import { SocialSignInNotice } from './social-sign-in-notice';

type LoginFormProps = {
  redirect?: string | undefined;
};

export function LoginForm({ redirect }: LoginFormProps) {
  const { t } = useTranslation('auth');
  const errorMessage = useErrorMessage();
  const signIn = useSignIn();
  const social = useSocialSignIn(redirect);
  const form = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSubmit = form.handleSubmit((values) => {
    social.clearNotice();
    signIn.mutate(values);
  });

  const handleSocialSelect = (provider: SocialProvider) => {
    signIn.reset();
    void social.select(provider);
  };

  const reason = isAppError(signIn.error) ? signIn.error.reason : undefined;
  const isUnconfirmed = reason === 'email_not_confirmed';

  return (
    <>
      {social.notice ? <SocialSignInNotice notice={social.notice} /> : null}
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
      <SocialSignIn pendingProvider={social.pendingProvider} onSelect={handleSocialSelect} />
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
          <TextLink to="/password-reset" className="self-end py-1">
            {t('login.forgotPassword')}
          </TextLink>
          <Button type="submit" size="xl" disabled={signIn.isPending} className="mt-1 w-full">
            {signIn.isPending ? t('login.pending') : t('login.submit')}
          </Button>
        </FieldGroup>
      </form>
    </>
  );
}
