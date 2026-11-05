import { useId, type ComponentProps } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { useValidationMessage } from '@/i18n/validation';
import { AuthInput } from './auth-input';
import { PasswordInput } from './password-input';

type SettingsTextFieldProps = Omit<ComponentProps<typeof AuthInput>, 'id' | 'aria-invalid'> & {
  label: string;
  error: string | undefined;
  hint?: string;
};

export function SettingsTextField({ label, error, hint, type, ...props }: SettingsTextFieldProps) {
  const validationMessage = useValidationMessage();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const isInvalid = Boolean(error);
  const Control = type === 'password' ? PasswordInput : AuthInput;
  const describedBy = [hint ? hintId : null, isInvalid ? errorId : null].filter(Boolean).join(' ');

  return (
    <Field data-invalid={isInvalid} className="gap-1.5">
      <FieldLabel htmlFor={id} className="text-label text-foreground">
        {label}
      </FieldLabel>
      <Control
        {...props}
        id={id}
        type={type}
        aria-invalid={isInvalid}
        aria-describedby={describedBy || undefined}
        className="h-11 short:h-11"
      />
      {hint ? (
        <FieldDescription id={hintId} className="text-caption leading-copy">
          {hint}
        </FieldDescription>
      ) : null}
      <FieldError id={errorId} className="text-caption leading-copy">
        {validationMessage(error)}
      </FieldError>
    </Field>
  );
}
