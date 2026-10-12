import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useErrorMessage } from '@/i18n/error-message';
import { useValidationMessage } from '@/i18n/validation';
import { useSignIn } from '../api/auth.queries';
import { credentialsSchema, type Credentials } from '../auth.schemas';

export function LoginForm() {
  const { t } = useTranslation('auth');
  const validationMessage = useValidationMessage();
  const errorMessage = useErrorMessage();
  const signIn = useSignIn();
  const emailId = useId();
  const passwordId = useId();
  const form = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSubmit = form.handleSubmit((values) => {
    signIn.mutate(values);
  });

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate className="flex flex-col gap-6">
      {signIn.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(signIn.error)}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={emailId}>{t('fields.email.label')}</FieldLabel>
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
              <FieldLabel htmlFor={passwordId}>{t('fields.password.label')}</FieldLabel>
              <Input
                {...field}
                id={passwordId}
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
            </Field>
          )}
        />
      </FieldGroup>
      <Button type="submit" disabled={signIn.isPending}>
        {t('login.submit')}
      </Button>
    </form>
  );
}
