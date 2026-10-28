import { cva, type VariantProps } from 'class-variance-authority';
import type { CSSProperties } from 'react';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';

const ringVariants = cva(
  'relative grid shrink-0 place-items-center rounded-full bg-[conic-gradient(var(--ring-color)_var(--ring-fill),var(--ring-track)_0)]',
  {
    variants: {
      size: {
        sm: 'size-12 text-score-sm',
        md: 'size-20 text-score-md',
        xl: 'size-36 text-score-xl sm:size-44',
      },
      hue: {
        online: '[--ring-color:var(--info)]',
        onInverse: '[--ring-color:var(--cta)]',
        education: '[--ring-color:var(--category-education)]',
        health: '[--ring-color:var(--category-health)]',
        transport: '[--ring-color:var(--category-transport)]',
        shopping: '[--ring-color:var(--category-shopping)]',
        green: '[--ring-color:var(--category-green)]',
        safety: '[--ring-color:var(--category-safety)]',
        city: '[--ring-color:var(--category-city)]',
      },
      surface: {
        light: '[--ring-track:var(--border-subtle)]',
        dark: '[--ring-track:color-mix(in_oklab,var(--on-inverse)_22%,transparent)]',
      },
    },
    defaultVariants: { size: 'md', hue: 'online', surface: 'light' },
  },
);

const innerVariants = cva('grid place-items-center rounded-full tabular-nums', {
  variants: {
    size: { sm: 'size-9', md: 'size-15', xl: 'size-28 sm:size-34' },
    surface: { light: 'bg-card text-foreground', dark: 'bg-info text-on-inverse' },
  },
  defaultVariants: { size: 'md', surface: 'light' },
});

type ScoreValueProps = VariantProps<typeof ringVariants> & {
  value: number;
  max?: number;
  label: string;
  caption?: string;
  className?: string;
};

export function ScoreValue({
  value,
  max = 100,
  size,
  hue,
  surface,
  label,
  caption,
  className,
}: ScoreValueProps) {
  const ringStyle: CSSProperties & { '--ring-fill': string } = {
    '--ring-fill': `${String(Math.min(Math.max(value / max, 0), 1) * 100)}%`,
  };

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(ringVariants({ size, hue, surface }), className)}
      style={ringStyle}
    >
      <span className={innerVariants({ size, surface })}>
        <span className="flex flex-col items-center leading-none font-extrabold">
          {formatNumber(value)}
          {caption ? (
            <span className="mt-1 text-meta font-semibold opacity-80">{caption}</span>
          ) : null}
        </span>
      </span>
    </span>
  );
}
