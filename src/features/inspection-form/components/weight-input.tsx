import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { parseWeight, weightDigits } from '../inspection-form.utils';

type WeightInputProps = {
  id: string;
  label: string;
  value: string;
  isEditable: boolean;
  isLabelVisible?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  onCommit: (weight: number) => void;
};

export function WeightInput({
  id,
  label,
  value,
  isEditable,
  isLabelVisible = false,
  onChange,
  onBlur,
  onCommit,
}: WeightInputProps) {
  return (
    <Field
      className={cn(
        'relative shrink-0',
        isLabelVisible ? 'w-40 gap-1.5' : 'w-20 gap-0 [&>.sr-only]:w-px',
      )}
    >
      <FieldLabel htmlFor={id} className={cn(!isLabelVisible && 'sr-only')}>
        {label}
      </FieldLabel>
      <div
        className={cn(
          'flex items-center rounded-md border pr-2.5 transition-colors',
          isLabelVisible ? 'h-control w-20' : 'h-10',
          isEditable
            ? 'border-border bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50'
            : 'border-transparent bg-transparent',
        )}
      >
        <Input
          id={id}
          value={value}
          inputMode="numeric"
          disabled={!isEditable}
          onChange={(event) => {
            onChange(weightDigits(event.target.value));
          }}
          onBlur={() => {
            onBlur();
            onCommit(parseWeight(value));
          }}
          className="h-full min-w-0 border-0 bg-transparent pr-0.5 pl-2 text-right text-body font-extrabold text-foreground tabular-nums focus-visible:ring-0 disabled:bg-transparent disabled:text-foreground"
        />
        <span aria-hidden className="text-small font-bold text-muted-foreground">
          %
        </span>
      </div>
    </Field>
  );
}
