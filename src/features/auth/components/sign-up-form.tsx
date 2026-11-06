import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { TextLink } from '@/components/navigation/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { useErrorMessage } from '@/i18n/error-message';
import { currentLocale } from '@/i18n/i18n';
import { useValidationMessage } from '@/i18n/validation';
import { isAppError } from '@/lib/errors';
import { applyServerErrors } from '@/lib/forms';
import { useSignUp } from '../api/auth.queries';
import {
  PASSWORD_MIN_LENGTH,
  signUpSchema,
  toSignUpPayload,
  type SignUpValues,
} from '../auth.schemas';
import type { SocialProvider } from '../auth.types';
import { useCaptcha } from '../hooks/use-captcha';
import { useSocialSignIn } from '../hooks/use-social-sign-in';
import { AuthNotice } from './auth-notice';
import { AuthTextField } from './auth-text-field';
import { Captcha } from './captcha';
import { SocialSignIn } from './social-sign-in';
import { SocialSignInNotice } from './social-sign-in-notice';

type SignUpFormProps = {
  redirect?: string | undefined;
  onConfirmationNeeded: (email: string, isRepeat: boolean) => void;
};

function hasSpecificMessage(error: unknown): boolean {
  return isAppError(error) && (error.code !== 'unknown' || error.reason !== undefined);
}

export function SignUpForm({ redirect, onConfirmationNeeded }: SignUpFormProps) {
  const { t } = useTranslation('auth');
  const errorMessage = useErrorMessage();
  const validationMessage = useValidationMessage();
  const signUp = useSignUp();
  const social = useSocialSignIn(redirect);
  const captcha = useCaptcha();
  const [formError, setFormError] = useState<unknown>();
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [isCaptchaMissing, setIsCaptchaMissing] = useState(false);
  const termsId = useId();
  const termsErrorId = `${termsId}-error`;
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', acceptsTerms: false },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    social.clearNotice();
    setFormError(undefined);
    setIsAlreadyRegistered(false);
    setIsCaptchaMissing(!captcha.isReady);
    if (!captcha.isReady) {
      return;
    }
    try {
      const result = await signUp.mutateAsync({
        ...toSignUpPayload(values, currentLocale(), redirect),
        captchaToken: captcha.token,
      });
      if (result.status === 'already_registered') {
        setIsAlreadyRegistered(true);
      } else if (result.status !== 'signed_in') {
        onConfirmationNeeded(values.email, result.status === 'confirmation_resent');
      }
    } catch (error) {
      if (!applyServerErrors(form, error)) {
        setFormError(error);
      }
    } finally {
      captcha.reset();
    }
  });

  const handleSocialSelect = (provider: SocialProvider) => {
    signUp.reset();
    setFormError(undefined);
    void social.select(provider);
  };

  return (
    <>
      {social.notice ? <SocialSignInNotice notice={social.notice} /> : null}
      {isAlreadyRegistered ? (
        <AuthNotice tone="warning" title={t('signUp.alreadyRegistered.title')}>
          <Trans
            t={t}
            i18nKey="signUp.alreadyRegistered.text"
            components={{
              signIn: (
                <TextLink to="/login" search={{ redirect }} size="inherit" className="px-0.5" />
              ),
              reset: <TextLink to="/password-reset" size="inherit" className="px-0.5" />,
            }}
          />
        </AuthNotice>
      ) : null}
      {isCaptchaMissing ? <AuthNotice tone="error">{t('captcha.required')}</AuthNotice> : null}
      {formError ? (
        <AuthNotice tone="error" title={t('signUp.failedTitle')}>
          {hasSpecificMessage(formError) ? errorMessage(formError) : t('signUp.failedText')}
        </AuthNotice>
      ) : null}
      <SocialSignIn pendingProvider={social.pendingProvider} onSelect={handleSocialSelect} />
      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <FieldGroup className="gap-3">
          <Controller
            name="fullName"
            control={form.control}
            render={({ field, fieldState }) => (
              <AuthTextField
                {...field}
                label={t('fields.name.label')}
                error={fieldState.error?.message}
                autoComplete="name"
              />
            )}
          />
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
            name="phone"
            control={form.control}
            render={({ field, fieldState }) => (
              <AuthTextField
                {...field}
                label={t('fields.phone.label')}
                error={fieldState.error?.message}
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder={t('fields.phone.placeholder')}
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
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                placeholder={t('fields.password.newPlaceholder', { count: PASSWORD_MIN_LENGTH })}
              />
            )}
          />
          <Controller
            name="acceptsTerms"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field orientation="horizontal" data-invalid={fieldState.invalid} className="py-2.5">
                <Checkbox
                  id={termsId}
                  name={field.name}
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked === true);
                  }}
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? termsErrorId : undefined}
                  className="mt-px"
                />
                <FieldContent className="gap-1">
                  <FieldLabel
                    htmlFor={termsId}
                    className="cursor-pointer text-body leading-compact font-normal text-foreground"
                  >
                    {t('fields.terms.label')}
                  </FieldLabel>
                  <FieldError id={termsErrorId} className="text-caption leading-copy">
                    {validationMessage(fieldState.error?.message)}
                  </FieldError>
                </FieldContent>
              </Field>
            )}
          />
          <Captcha key={captcha.widgetKey} onToken={captcha.setToken} />
          <Button type="submit" size="xl" disabled={signUp.isPending} className="mt-1 w-full">
            {signUp.isPending ? t('signUp.pending') : t('signUp.submit')}
          </Button>
        </FieldGroup>
      </form>
    </>
  );
}
