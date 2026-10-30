import { zodResolver } from '@hookform/resolvers/zod';
import { MailIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { FieldLabel } from '@/components/ui/field';
import { useErrorMessage } from '@/i18n/error-message';
import { isAppError } from '@/lib/errors';
import { useSignIn } from '../api/auth.queries';
import { credentialsSchema, type Credentials } from '../auth.schemas';
import type { SocialProvider } from '../auth.types';
import { AuthFieldError } from './auth-field-error';
import { AuthInput } from './auth-input';
import { AuthNotice } from './auth-notice';
import { PasswordInput } from './password-input';
import { SocialSignIn } from './social-sign-in';

export function LoginForm() {
  const { t } = useTranslation('auth');
  const errorMessage = useErrorMessage();
  const signIn = useSignIn();
  const [oauthProvider, setOauthProvider] = useState<SocialProvider>();
  const emailId = useId();
  const passwordId = useId();
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
      {oauthProvider ? (
        <AuthNotice
          tone="error"
          title={t('social.errorTitle', { provider: t(`social.providers.${oauthProvider}`) })}
        >
          {t('social.errorText')}
        </AuthNotice>
      ) : null}
      {signIn.error ? (
        <AuthNotice
          tone={isUnconfirmed ? 'warning' : 'error'}
          title={t(isUnconfirmed ? 'login.unconfirmedTitle' : 'login.failedTitle')}
        >
          {isUnconfirmed
            ? t('login.unconfirmedText', { email: signIn.variables.email })
            : reason === 'invalid_credentials'
              ? t('login.failedText')
              : errorMessage(signIn.error)}
        </AuthNotice>
      ) : null}
      {isUnconfirmed ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full gap-2.5 border-[1.5px] text-body font-bold"
        >
          <MailIcon aria-hidden />
          {t('login.resendConfirmation')}
        </Button>
      ) : null}
      <SocialSignIn onSelect={handleSocialSelect} />
      <form
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-3"
      >
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <>
              <FieldLabel htmlFor={emailId} className="sr-only">
                {t('fields.email.label')}
              </FieldLabel>
              <AuthInput
                {...field}
                id={emailId}
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder={t('fields.email.label')}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? `${emailId}-error` : undefined}
              />
              <AuthFieldError id={`${emailId}-error`}>
                {fieldState.invalid ? t('fields.email.error') : null}
              </AuthFieldError>
            </>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <>
              <FieldLabel htmlFor={passwordId} className="sr-only">
                {t('fields.password.label')}
              </FieldLabel>
              <PasswordInput
                {...field}
                id={passwordId}
                autoComplete="current-password"
                placeholder={t('fields.password.label')}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? `${passwordId}-error` : undefined}
              />
              <AuthFieldError id={`${passwordId}-error`}>
                {fieldState.invalid ? t('fields.password.required') : null}
              </AuthFieldError>
            </>
          )}
        />
        <Button
          type="submit"
          disabled={signIn.isPending}
          className="mt-1 h-13.5 w-full rounded-md text-[15px] font-[730] short:h-11.5"
        >
          {signIn.isPending ? t('login.pending') : t('login.submit')}
        </Button>
      </form>
    </>
  );
}
