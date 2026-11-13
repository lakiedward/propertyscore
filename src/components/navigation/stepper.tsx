import { cn } from '@/lib/utils';

type StepperProps = {
  label: string;
  steps: readonly { id: string; label: string }[];
  current: number;
};

export function Stepper({ label, steps, current }: StepperProps) {
  return (
    <ol
      aria-label={label}
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${String(steps.length)}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => {
        const position = index + 1;
        const isCurrent = position === current;
        return (
          <li
            key={step.id}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex min-w-0 flex-col gap-1.5"
          >
            <span
              aria-hidden
              className={cn(
                'h-1.5 rounded-full',
                position <= current ? 'bg-primary' : 'bg-surface-alt',
              )}
            />
            <span
              className={cn(
                'truncate text-caption leading-copy',
                isCurrent
                  ? 'font-extrabold text-foreground'
                  : 'sr-only font-semibold text-muted-foreground sm:not-sr-only',
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
