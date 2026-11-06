import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TextLink } from '@/components/navigation/text-link';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { isAppError } from '@/lib/errors';
import { useResendConfirmation, useSignIn } from '../api/auth.queries';
import { credentialsSchema, type Credentials } from '../auth.schemas';
import type { SocialProvider } from '../auth.types';
import { useCaptcha } from '../hooks/use-captcha';
import { useSocialSignIn } from '../hooks/use-social-sign-in';
import { AuthNotice } from './auth-notice';
import { AuthTextField } from './auth-text-field';
import { CaptchaField } from './captcha-field';
import { FormErrorNotice } from './form-error-notice';
import { ResendLink } from './resend-link';
import { SocialSignIn } from './social-sign-in';
import { SocialSignInNotice } from './social-sign-in-notice';

type LoginFormProps = {
  redirect?: string | undefined;
};

export function LoginForm({ redirect }: LoginFormProps) {
  const { t } = useTranslation(['auth', 'common']);
  const signIn = useSignIn();
  const social = useSocialSignIn(redirect);
  const resendConfirmation = useResendConfirmation();
  const captcha = useCaptcha();
  const form = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSubmit = form.handleSubmit((values) => {
    social.clearNotice();
    const captchaResult = captcha.consume();
    if (!captchaResult) {
      return;
    }
    signIn.mutate({ ...values, captchaToken: captchaResult.token });
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
        <>
          <AuthNotice tone="warning" title={t('login.unconfirmedTitle')}>
            {t('login.unconfirmedText', { email: signIn.variables.email })}
          </AuthNotice>
          <ResendLink
            onResend={async (captchaToken) => {
              await resendConfirmation.mutateAsync({
                email: signIn.variables.email,
                redirect,
                captchaToken,
              });
            }}
          />
        </>
      ) : null}
      {signIn.error && !isUnconfirmed ? (
        <FormErrorNotice
          error={signIn.error}
          title={t('login.failedTitle')}
          fallback={t('common:errors.unknown')}
          reasonMessages={{ invalid_credentials: t('login.failedText') }}
        />
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
          <TextLink to="/password-reset" className="touch-target self-end py-1">
            {t('login.forgotPassword')}
          </TextLink>
          <CaptchaField captcha={captcha} />
          <Button type="submit" size="xl" disabled={signIn.isPending} className="mt-1 w-full">
            {signIn.isPending ? t('login.pending') : t('login.submit')}
          </Button>
        </FieldGroup>
      </form>
    </>
  );
}
