import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useErrorMessage } from '@/i18n/error-message';
import { currentLocale } from '@/i18n/i18n';
import { useValidationMessage } from '@/i18n/validation';
import { useSignUp } from '../api/auth.queries';
import { PASSWORD_MIN_LENGTH, signUpSchema, type SignUpValues } from '../auth.schemas';

export function SignUpForm() {
  const { t } = useTranslation(['auth', 'common']);
  const validationMessage = useValidationMessage();
  const errorMessage = useErrorMessage();
  const signUp = useSignUp();
  const emailId = useId();
  const passwordId = useId();
  const passwordHintId = useId();
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSubmit = form.handleSubmit((values) => {
    signUp.mutate({ ...values, locale: currentLocale() });
  });

  if (signUp.data?.needsEmailConfirmation) {
    return (
      <Alert>
        <AlertDescription>
          {t('auth:signUp.checkEmail', { email: signUp.variables.email })}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate className="flex flex-col gap-6">
      {signUp.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(signUp.error)}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={emailId}>{t('auth:fields.email.label')}</FieldLabel>
              <Input
                {...field}
                id={emailId}
                type="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
              />
              <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={passwordId}>{t('auth:fields.password.label')}</FieldLabel>
              <Input
                {...field}
                id={passwordId}
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                aria-describedby={passwordHintId}
              />
              <FieldDescription id={passwordHintId}>
                {t('common:validation.minLength', { count: PASSWORD_MIN_LENGTH })}
              </FieldDescription>
              <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
            </Field>
          )}
        />
      </FieldGroup>
      <Button type="submit" disabled={signUp.isPending}>
        {t('auth:signUp.submit')}
      </Button>
    </form>
  );
}
