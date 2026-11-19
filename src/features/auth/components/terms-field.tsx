import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { useValidationMessage } from '@/i18n/validation';

type TermsFieldProps = {
  name: string;
  isChecked: boolean;
  error: string | undefined;
  onCheckedChange: (isChecked: boolean) => void;
  onBlur: () => void;
};

export function TermsField({ name, isChecked, error, onCheckedChange, onBlur }: TermsFieldProps) {
  const { t } = useTranslation('auth');
  const validationMessage = useValidationMessage();
  const id = useId();
  const errorId = `${id}-error`;
  const isInvalid = Boolean(error);

  return (
    <Field orientation="horizontal" data-invalid={isInvalid} className="py-2.5">
      <Checkbox
        id={id}
        name={name}
        checked={isChecked}
        onCheckedChange={(checked) => {
          onCheckedChange(checked === true);
        }}
        onBlur={onBlur}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? errorId : undefined}
        className="mt-px"
      />
      <FieldContent className="gap-1">
        <FieldLabel
          htmlFor={id}
          className="cursor-pointer text-body leading-compact font-normal text-foreground"
        >
          {t('fields.terms.label')}
        </FieldLabel>
        <FieldError id={errorId} className="text-caption leading-copy">
          {validationMessage(error)}
        </FieldError>
      </FieldContent>
    </Field>
  );
}
