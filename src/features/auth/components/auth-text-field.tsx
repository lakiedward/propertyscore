import { CircleAlertIcon } from 'lucide-react';
import { useId, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type AuthTextFieldProps = ComponentProps<typeof Input> & {
  label: string;
  hint?: string;
  error?: string | undefined;
};

export function AuthTextField({ label, hint, error, className, ...props }: AuthTextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.75">
      <Label htmlFor={id} className="text-label text-foreground">
        {label}
      </Label>
      {hint ? (
        <p id={hintId} className="text-small text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        className={cn(
          'h-11.25 rounded-md border-[1.5px] border-border bg-card px-3.5 text-body aria-invalid:ring-0 md:text-body',
          className,
        )}
        {...props}
      />
      {error ? (
        <p
          id={errorId}
          className="flex items-center gap-1.5 text-small leading-[1.4] font-semibold text-destructive"
        >
          <CircleAlertIcon aria-hidden className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
