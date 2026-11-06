import { useId, type ComponentProps } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { useValidationMessage } from '@/i18n/validation';
import { cn } from '@/lib/utils';
import { AuthInput } from './auth-input';
import { PasswordInput } from './password-input';

type AuthTextFieldProps = Omit<ComponentProps<typeof AuthInput>, 'id' | 'aria-invalid'> & {
  label: string;
  error: string | undefined;
  hint?: string;
};

export function AuthTextField({
  label,
  error,
  hint,
  look = 'auth',
  type,
  placeholder,
  ...props
}: AuthTextFieldProps) {
  const validationMessage = useValidationMessage();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const isInvalid = Boolean(error);
  const isLabelVisible = look === 'settings';
  const Control = type === 'password' ? PasswordInput : AuthInput;
  const describedBy = [hint ? hintId : null, isInvalid ? errorId : null].filter(Boolean).join(' ');

  return (
    <Field data-invalid={isInvalid} className="gap-1.5">
      <FieldLabel
        htmlFor={id}
        className={cn(isLabelVisible ? 'text-label text-foreground' : 'sr-only')}
      >
        {label}
      </FieldLabel>
      <Control
        {...props}
        id={id}
        look={look}
        type={type}
        placeholder={placeholder ?? (isLabelVisible ? undefined : label)}
        aria-invalid={isInvalid}
        aria-describedby={describedBy || undefined}
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
