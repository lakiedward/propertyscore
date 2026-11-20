import { cva } from 'class-variance-authority';

export const scheduleItemVariants = cva(
  'rounded-md border-0 border-l-4 text-left text-foreground shadow-[0_1px_0_var(--color-border)] outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring',
  {
    variants: {
      status: {
        scheduled: 'border-step-slate-solid bg-step-slate-soft',
        inspector_assigned: 'border-primary bg-secondary',
        completed: 'border-border-strong bg-background',
        book_ready: 'border-border-strong bg-background',
        cancelled: 'border-border-strong bg-background',
      },
    },
  },
);
