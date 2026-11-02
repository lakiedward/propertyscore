import { useId, type ComponentProps } from 'react';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { useValidationMessage } from '@/i18n/validation';
import { AuthInput } from './auth-input';
import { PasswordInput } from './password-input';

type AuthTextFieldProps = Omit<ComponentProps<typeof AuthInput>, 'id' | 'aria-invalid'> & {
  label: string;
  error: string | undefined;
};

export function AuthTextField({ label, error, type, placeholder, ...props }: AuthTextFieldProps) {
  const validationMessage = useValidationMessage();
  const id = useId();
  const errorId = `${id}-error`;
  const isInvalid = Boolean(error);
  const Control = type === 'password' ? PasswordInput : AuthInput;

  return (
    <Field data-invalid={isInvalid} className="gap-1.5">
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <Control
        {...props}
        id={id}
        type={type}
        placeholder={placeholder ?? label}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? errorId : undefined}
      />
      <FieldError id={errorId} className="text-caption leading-copy">
        {validationMessage(error)}
      </FieldError>
    </Field>
  );
}
