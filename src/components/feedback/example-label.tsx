import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const exampleLabelVariants = cva(
  'inline-flex w-fit items-center rounded-sm px-2 py-0.5 text-meta font-bold tracking-wide uppercase',
  {
    variants: {
      tone: {
        light: 'bg-surface-sunken text-muted-foreground',
        dark: 'bg-on-inverse/15 text-on-inverse',
      },
    },
  },
);

type ExampleLabelProps = {
  label: string;
  tone?: 'light' | 'dark';
  className?: string;
};

export function ExampleLabel({ label, tone = 'light', className }: ExampleLabelProps) {
  return <span className={cn(exampleLabelVariants({ tone }), className)}>{label}</span>;
}
