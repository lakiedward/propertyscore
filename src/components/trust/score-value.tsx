import { cva } from 'class-variance-authority';
import type { CSSProperties } from 'react';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';

type ScoreHue =
  | 'online'
  | 'onInverse'
  | 'education'
  | 'health'
  | 'transport'
  | 'shopping'
  | 'green'
  | 'safety'
  | 'city';

const HUE_CLASS: Readonly<Record<ScoreHue, string>> = {
  online: '[--ring-color:var(--info)] [--ring-soft:var(--info-surface)]',
  onInverse:
    '[--ring-color:var(--cta)] [--ring-soft:color-mix(in_oklab,var(--on-inverse)_16%,transparent)]',
  education:
    '[--ring-color:var(--category-education)] [--ring-soft:var(--category-education-surface)]',
  health: '[--ring-color:var(--category-health)] [--ring-soft:var(--category-health-surface)]',
  transport:
    '[--ring-color:var(--category-transport)] [--ring-soft:var(--category-transport-surface)]',
  shopping:
    '[--ring-color:var(--category-shopping)] [--ring-soft:var(--category-shopping-surface)]',
  green: '[--ring-color:var(--category-green)] [--ring-soft:var(--category-green-surface)]',
  safety: '[--ring-color:var(--category-safety)] [--ring-soft:var(--category-safety-surface)]',
  city: '[--ring-color:var(--category-city)] [--ring-soft:var(--category-city-surface)]',
};

const discVariants = cva(
  'relative grid shrink-0 place-items-center rounded-full bg-[conic-gradient(var(--ring-color)_var(--ring-fill),var(--ring-track)_0)]',
  {
    variants: {
      size: {
        sm: 'size-12 text-score-sm',
        md: 'size-20 text-score-md',
        xl: 'size-36 text-score-xl sm:size-44',
      },
      surface: {
        light: '[--ring-track:var(--border-subtle)]',
        dark: '[--ring-track:color-mix(in_oklab,var(--on-inverse)_22%,transparent)]',
      },
    },
    defaultVariants: { size: 'md', surface: 'light' },
  },
);

const discInnerVariants = cva('grid place-items-center rounded-full tabular-nums', {
  variants: {
    size: { sm: 'size-9', md: 'size-15', xl: 'size-28 sm:size-34' },
    surface: { light: 'bg-card text-foreground', dark: 'bg-info text-on-inverse' },
  },
  defaultVariants: { size: 'md', surface: 'light' },
});

const strokeNumberVariants = cva('tabular-nums', {
  variants: {
    size: {
      sm: 'text-lead-sm font-extrabold tracking-[-0.03em] text-info-ink',
      lg: 'text-score-2xl text-on-inverse',
    },
  },
});

const STROKE_GEOMETRY = {
  sm: { box: 40, radius: 16, width: 4 },
  lg: { box: 120, radius: 50, width: 10 },
} as const;

type ScoreValueBaseProps = {
  value: number;
  max?: number;
  hue?: ScoreHue;
  label: string;
  caption?: string;
  className?: string;
};

type ScoreValueProps = ScoreValueBaseProps &
  (
    | {
        variant?: 'disc';
        size?: 'sm' | 'md' | 'xl';
        surface?: 'light' | 'dark';
      }
    | {
        variant: 'stroke';
        size: 'sm' | 'lg';
      }
  );

function fillPercent(value: number, max: number): number {
  return Math.min(Math.max(value / max, 0), 1) * 100;
}

export function ScoreValue(props: ScoreValueProps) {
  const { value, max = 100, hue = 'online', label, caption, className } = props;
  const percent = fillPercent(value, max);

  if (props.variant === 'stroke') {
    const geometry = STROKE_GEOMETRY[props.size];
    const center = geometry.box / 2;
    return (
      <span
        role="img"
        aria-label={label}
        className={cn('relative block aspect-square', HUE_CLASS[hue], className)}
      >
        <svg
          viewBox={`0 0 ${String(geometry.box)} ${String(geometry.box)}`}
          aria-hidden="true"
          className="size-full"
        >
          <circle
            cx={center}
            cy={center}
            r={geometry.radius}
            fill="none"
            strokeWidth={geometry.width}
            className="stroke-(--ring-soft)"
          />
          <circle
            cx={center}
            cy={center}
            r={geometry.radius}
            fill="none"
            strokeWidth={geometry.width}
            pathLength={100}
            strokeDasharray={`${String(percent)} 100`}
            strokeLinecap="round"
            transform={`rotate(-90 ${String(center)} ${String(center)})`}
            className="stroke-(--ring-color)"
          />
        </svg>
        <span
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <b className={strokeNumberVariants({ size: props.size })}>{formatNumber(value)}</b>
          {caption ? (
            <small className="mt-0.5 text-small font-bold text-on-info-muted">{caption}</small>
          ) : null}
        </span>
      </span>
    );
  }

  const { size, surface } = props;
  const ringStyle: CSSProperties & { '--ring-fill': string } = {
    '--ring-fill': `${String(percent)}%`,
  };

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(discVariants({ size, surface }), HUE_CLASS[hue], className)}
      style={ringStyle}
    >
      <span className={discInnerVariants({ size, surface })}>
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
