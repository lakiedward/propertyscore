import { cva } from 'class-variance-authority';
import { CheckIcon } from 'lucide-react';

const markVariants = cva(
  'grid size-10 shrink-0 place-items-center rounded-full text-body font-extrabold tabular-nums',
  {
    variants: {
      state: {
        done: 'bg-primary text-primary-foreground',
        current: 'bg-primary text-cta ring-4 ring-cta',
        upcoming: 'border-2 border-border-strong bg-card text-ink-soft',
      },
    },
  },
);

const labelVariants = cva('truncate text-body', {
  variants: {
    state: {
      done: 'font-bold text-brand max-w760:sr-only',
      current: 'font-extrabold text-brand max-w480:sr-only',
      upcoming: 'font-semibold text-ink-soft max-w760:sr-only',
    },
  },
});

const lineVariants = cva('h-1 min-w-4 flex-1 rounded-full', {
  variants: {
    state: {
      done: 'bg-primary',
      current: 'bg-border-strong/40',
      upcoming: 'bg-border-strong/40',
    },
  },
});

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
    <ol aria-label={label} className="flex items-center gap-3">
      {steps.map((step, index) => {
        const state = stepState(index, current);
        const isLast = index === steps.length - 1;
        return (
          <li
            key={step}
            aria-current={state === 'current' ? 'step' : undefined}
            className="flex min-w-0 flex-1 items-center gap-3 last:flex-none"
          >
            <span aria-hidden className={markVariants({ state })}>
              {state === 'done' ? <CheckIcon className="size-5" strokeWidth={3} /> : index + 1}
            </span>
            <span className={labelVariants({ state })}>{step}</span>
            {isLast ? null : <span aria-hidden className={lineVariants({ state })} />}
          </li>
        );
      })}
    </ol>
  );
}
