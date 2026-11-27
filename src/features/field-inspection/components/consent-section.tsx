import { CheckIcon } from 'lucide-react';
import { useId } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

type ConsentSectionProps = {
  number: number;
  title: string;
  text: string;
  checkLabel: string;
  meta: string;
  language: string;
  isChecked: boolean;
  isDisabled: boolean;
  onCheckedChange: (isChecked: boolean) => void;
};

export function ConsentSection({
  number,
  title,
  text,
  checkLabel,
  meta,
  language,
  isChecked,
  isDisabled,
  onCheckedChange,
}: ConsentSectionProps) {
  const checkId = useId();
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      lang={language}
      className={cn(
        'flex flex-col gap-2.5 rounded-xl border bg-card px-4.5 py-4 shadow-card-soft',
        isChecked ? 'border-success' : 'border-card',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-full text-small font-extrabold text-primary-foreground',
            isChecked ? 'bg-success' : 'bg-primary',
          )}
        >
          {isChecked ? <CheckIcon className="size-4" /> : number}
        </span>
        <div className="flex min-w-0 flex-col">
          <h3 id={titleId} className="text-base font-bold">
            {title}
          </h3>
          <span className="text-meta text-muted-foreground">{meta}</span>
        </div>
      </div>
      <p className="text-body-sm leading-relaxed">{text}</p>
      <Field orientation="horizontal" className="items-start gap-3">
        <Checkbox
          id={checkId}
          checked={isChecked}
          disabled={isDisabled}
          onCheckedChange={(state) => {
            onCheckedChange(state === true);
          }}
          className="mt-0.5"
        />
        <FieldLabel htmlFor={checkId} className="text-body-sm leading-normal font-semibold">
          {checkLabel}
        </FieldLabel>
      </Field>
    </section>
  );
}
