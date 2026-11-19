import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { currentLocale } from '@/i18n/i18n';
import { useSignUp } from '../api/auth.queries';
import {
  PASSWORD_MIN_LENGTH,
  signUpSchema,
  toSignUpPayload,
  type SignUpValues,
} from '../auth.schemas';
import type { SocialProvider } from '../auth.types';
import { useCaptcha } from '../hooks/use-captcha';
import { useFormError } from '../hooks/use-form-error';
import { useSocialSignIn } from '../hooks/use-social-sign-in';
import { AlreadyRegisteredNotice } from './already-registered-notice';
import { AuthTextField } from './auth-text-field';
import { CaptchaField } from './captcha-field';
import { FormErrorNotice } from './form-error-notice';
import { SocialSignIn } from './social-sign-in';
import { SocialSignInNotice } from './social-sign-in-notice';
import { TermsField } from './terms-field';

type SignUpFormProps = {
  redirect?: string | undefined;
  onConfirmationNeeded: (email: string, isRepeat: boolean) => void;
};

export function SignUpForm({ redirect, onConfirmationNeeded }: SignUpFormProps) {
  const { t } = useTranslation('auth');
  const signUp = useSignUp();
  const social = useSocialSignIn(redirect);
  const captcha = useCaptcha();
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', acceptsTerms: false },
  });
  const formError = useFormError(form);

  const handleSubmit = form.handleSubmit(async (values) => {
    social.clearNotice();
    formError.clear();
    setIsAlreadyRegistered(false);
    const captchaResult = captcha.consume();
    if (!captchaResult) {
      return;
    }
    try {
      const result = await signUp.mutateAsync({
        ...toSignUpPayload(values, currentLocale(), redirect),
        captchaToken: captchaResult.token,
      });
      if (result.status === 'already_registered') {
        setIsAlreadyRegistered(true);
      } else if (result.status !== 'signed_in') {
        onConfirmationNeeded(values.email, result.status === 'confirmation_resent');
      }
    } catch (error) {
      formError.handle(error);
    }
  });

  const handleSocialSelect = (provider: SocialProvider) => {
    signUp.reset();
    formError.clear();
    void social.select(provider);
  };

  return (
    <>
      {social.notice ? <SocialSignInNotice notice={social.notice} /> : null}
      {isAlreadyRegistered ? <AlreadyRegisteredNotice redirect={redirect} /> : null}
      {formError.error ? (
        <FormErrorNotice
          error={formError.error}
          title={t('signUp.failedTitle')}
          fallback={t('signUp.failedText')}
        />
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
              <TermsField
                name={field.name}
                isChecked={field.value}
                error={fieldState.error?.message}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <CaptchaField captcha={captcha} />
          <Button type="submit" size="xl" disabled={signUp.isPending} className="mt-1 w-full">
            {signUp.isPending ? t('signUp.pending') : t('signUp.submit')}
          </Button>
        </FieldGroup>
      </form>
    </>
  );
}
