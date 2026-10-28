import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const numberVariants = cva(
  'grid size-11 shrink-0 place-items-center rounded-full font-heading text-h4 tabular-nums',
  {
    variants: {
      tone: {
        onInfo: 'bg-cta text-cta-foreground',
        light: 'bg-category-transport-fill text-cta-foreground',
        onForest: 'bg-cta text-cta-foreground',
      },
    },
  },
);

type HowItWorksStepsProps = {
  steps: readonly { key: string; title: string; text: string }[];
  tone: 'onInfo' | 'light' | 'onForest';
  className?: string;
};

export function HowItWorksSteps({ steps, tone, className }: HowItWorksStepsProps) {
  return (
    <ol className={cn('grid gap-5 md:grid-cols-3 md:gap-6', className)}>
      {steps.map((step, index) => (
        <li key={step.key} className="flex gap-4 md:flex-col md:gap-3">
          <span className={numberVariants({ tone })} aria-hidden="true">
            {index + 1}
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-label">{step.title}</span>
            <span
              className={cn(
                'text-small',
                tone === 'light' ? 'text-muted-foreground' : 'text-on-inverse-muted',
              )}
            >
              {step.text}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
