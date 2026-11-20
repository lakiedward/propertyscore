import { cva } from 'class-variance-authority';
import { CheckIcon } from 'lucide-react';

const barVariants = cva('h-1.5 rounded-full', {
  variants: {
    state: {
      done: 'bg-primary',
      current: 'bg-primary',
      upcoming: 'bg-step-leaf-surface',
    },
  },
});

const labelVariants = cva('flex min-w-0 items-center gap-2 text-meta sm:text-small', {
  variants: {
    state: {
      done: 'font-semibold text-foreground',
      current: 'font-extrabold text-foreground',
      upcoming: 'font-semibold text-muted-foreground',
    },
  },
});

const markVariants = cva(
  'grid size-6 shrink-0 place-items-center rounded-full text-meta font-extrabold',
  {
    variants: {
      state: {
        done: 'bg-primary text-primary-foreground',
        current: 'bg-cta text-cta-foreground',
        upcoming: 'bg-step-leaf-soft text-muted-foreground',
      },
    },
  },
);

type StepState = 'done' | 'current' | 'upcoming';

function stepState(index: number, current: number): StepState {
  if (index < current) {
    return 'done';
  }
  return index === current ? 'current' : 'upcoming';
}

type StepperProps = {
  label: string;
  steps: readonly string[];
  current: number;
};

export function Stepper({ label, steps, current }: StepperProps) {
  return (
    <ol
      aria-label={label}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${String(steps.length)}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => {
        const state = stepState(index, current);
        return (
          <li
            key={step}
            aria-current={state === 'current' ? 'step' : undefined}
            className="flex min-w-0 flex-col gap-2"
          >
            <span aria-hidden className={barVariants({ state })} />
            <span className={labelVariants({ state })}>
              <span aria-hidden className={markVariants({ state })}>
                {state === 'done' ? <CheckIcon className="size-3.5" /> : index + 1}
              </span>
              <span className="truncate max-w480:sr-only">{step}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
