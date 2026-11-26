import { Trash2Icon } from 'lucide-react';
import { useId } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useValidationMessage } from '@/i18n/validation';
import type { ConsentSectionsValues } from '../inspection-form.schemas';
import type { Locale } from '@/i18n/i18n';

type ConsentSectionFieldsProps = {
  index: number;
  language: Locale;
  control: Control<ConsentSectionsValues>;
  isEditable: boolean;
  onRemove: () => void;
};

export function ConsentSectionFields({
  index,
  language,
  control,
  isEditable,
  onRemove,
}: ConsentSectionFieldsProps) {
  const { t } = useTranslation('inspectionForm');
  const validationMessage = useValidationMessage();
  const baseId = useId();
  const fields = [
    { name: `title_${language}`, label: t('consent.fields.title'), isLong: false },
    { name: `text_${language}`, label: t('consent.fields.text'), isLong: true },
    { name: `check_${language}`, label: t('consent.fields.check'), isLong: false },
  ] as const;

  return (
    <section
      aria-labelledby={`${baseId}-title`}
      className="flex flex-col gap-3 rounded-lg border border-card bg-card px-4.5 py-4 shadow-card-soft"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          id={`${baseId}-title`}
          className="text-eyebrow font-bold text-muted-foreground uppercase"
        >
          {t('consent.section', { number: index + 1 })}
        </span>
        {isEditable ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('consent.removeSection', { number: index + 1 })}
            onClick={onRemove}
          >
            <Trash2Icon aria-hidden />
          </Button>
        ) : null}
      </div>
      {fields.map((item) => (
        <Controller
          key={item.name}
          name={`sections.${index}.${item.name}`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${baseId}-${item.name}`}>{item.label}</FieldLabel>
              {item.isLong ? (
                <Textarea
                  {...field}
                  id={`${baseId}-${item.name}`}
                  lang={language}
                  disabled={!isEditable}
                  aria-invalid={fieldState.invalid}
                  className="min-h-37.5"
                />
              ) : (
                <Input
                  {...field}
                  id={`${baseId}-${item.name}`}
                  lang={language}
                  disabled={!isEditable}
                  aria-invalid={fieldState.invalid}
                />
              )}
              <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
            </Field>
          )}
        />
      ))}
    </section>
  );
}
