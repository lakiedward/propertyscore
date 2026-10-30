import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useValidationMessage } from '@/i18n/validation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldLabel } from '@/components/ui/field';
import { useErrorMessage } from '@/i18n/error-message';
import { currentLocale } from '@/i18n/i18n';
import { isAppError } from '@/lib/errors';
import { useSignUp } from '../api/auth.queries';
import { PASSWORD_MIN_LENGTH, signUpSchema, type SignUpValues } from '../auth.schemas';
import type { SocialProvider } from '../auth.types';
import { AuthFieldError } from './auth-field-error';
import { AuthInput } from './auth-input';
import { AuthNotice } from './auth-notice';
import { PasswordInput } from './password-input';
import { SocialSignIn } from './social-sign-in';

type SignUpFormProps = {
  onEmailSent: (email: string) => void;
};

export function SignUpForm({ onEmailSent }: SignUpFormProps) {
  const { t } = useTranslation('auth');
  const errorMessage = useErrorMessage();
  const validationMessage = useValidationMessage();
  const signUp = useSignUp();
  const [oauthProvider, setOauthProvider] = useState<SocialProvider>();
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const termsId = useId();
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', acceptsTerms: false },
  });

  const handleSubmit = form.handleSubmit((values) => {
    setOauthProvider(undefined);
    signUp.mutate(
      {
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        locale: currentLocale(),
      },
      {
        onSuccess: (result) => {
          if (result.needsEmailConfirmation) {
            onEmailSent(values.email);
          }
        },
      },
    );
  });

  const handleSocialSelect = (provider: SocialProvider) => {
    signUp.reset();
    setOauthProvider(provider);
  };

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
      {signUp.error ? (
        <AuthNotice tone="error" title={t('signUp.failedTitle')}>
          {isAppError(signUp.error) && signUp.error.reason
            ? errorMessage(signUp.error)
            : t('signUp.failedText')}
        </AuthNotice>
      ) : null}
      <SocialSignIn onSelect={handleSocialSelect} />
      <form
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-3"
      >
        <Controller
          name="fullName"
          control={form.control}
          render={({ field, fieldState }) => (
            <>
              <FieldLabel htmlFor={nameId} className="sr-only">
                {t('fields.name.label')}
              </FieldLabel>
              <AuthInput
                {...field}
                id={nameId}
                autoComplete="name"
                placeholder={t('fields.name.label')}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? `${nameId}-error` : undefined}
              />
              <AuthFieldError id={`${nameId}-error`}>
                {fieldState.invalid ? t('fields.name.error') : null}
              </AuthFieldError>
            </>
          )}
        />
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
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                placeholder={t('fields.password.newPlaceholder')}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? `${passwordId}-error` : undefined}
              />
              <AuthFieldError id={`${passwordId}-error`}>
                {fieldState.error?.type === 'too_big'
                  ? validationMessage(fieldState.error.message)
                  : fieldState.invalid
                    ? t('fields.password.tooShort')
                    : null}
              </AuthFieldError>
            </>
          )}
        />
        <Controller
          name="acceptsTerms"
          control={form.control}
          render={({ field, fieldState }) => (
            <label
              htmlFor={termsId}
              className="flex cursor-pointer items-start gap-3 py-2.5 text-body leading-[1.45] text-foreground"
            >
              <Checkbox
                id={termsId}
                name={field.name}
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked === true);
                }}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
                className="mt-px"
              />
              <span>{t('fields.terms.label')}</span>
            </label>
          )}
        />
        <Button
          type="submit"
          disabled={signUp.isPending}
          className="mt-1 h-13.5 w-full rounded-md text-[15px] font-[730] short:h-11.5"
        >
          {signUp.isPending ? t('login.pending') : t('signUp.submit')}
        </Button>
      </form>
    </>
  );
}
