import { cva } from 'class-variance-authority';
import { CheckIcon, CircleDotIcon, CircleIcon, XIcon, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type StageState = 'done' | 'current' | 'upcoming' | 'cancelled';

export type Stage = {
  id: string;
  label: string;
  meta?: string;
  state: StageState;
  stateText?: string;
};

const STAGE_ICON = {
  done: CheckIcon,
  current: CircleDotIcon,
  upcoming: CircleIcon,
  cancelled: XIcon,
} as const satisfies Record<StageState, LucideIcon>;

const markVariants = cva(
  'grid size-8 shrink-0 place-items-center rounded-full border-2 [&_svg]:size-4',
  {
    variants: {
      state: {
        done: 'border-primary bg-primary text-primary-foreground',
        current: 'border-primary bg-cta text-cta-foreground',
        upcoming: 'border-border-strong bg-card text-muted-foreground',
        cancelled: 'border-destructive bg-error-surface text-destructive',
      },
    },
  },
);

const stateTextVariants = cva('text-meta font-bold tracking-[0.04em] uppercase', {
  variants: {
    state: {
      done: 'text-success',
      current: 'text-brand',
      upcoming: 'text-muted-foreground',
      cancelled: 'text-destructive',
    },
  },
});

type StageTimelineProps = {
  label: string;
  stages: readonly Stage[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
};

export function StageTimeline({
  label,
  stages,
  orientation = 'horizontal',
  className,
}: StageTimelineProps) {
  const { t } = useTranslation();
  const isVertical = orientation === 'vertical';

  return (
    <ol
      aria-label={label}
      className={cn(isVertical ? 'flex flex-col' : 'grid', className)}
      style={
        isVertical
          ? undefined
          : { gridTemplateColumns: `repeat(${String(stages.length)}, minmax(0, 1fr))` }
      }
    >
      {stages.map((stage, index) => {
        const Icon = STAGE_ICON[stage.state];
        const isLast = index === stages.length - 1;
        const line = (
          <span
            aria-hidden
            className={cn(
              stage.state === 'done' ? 'bg-primary' : 'bg-border',
              isLast && 'opacity-0',
              isVertical ? 'my-1.5 min-h-5 w-0.5 flex-1' : 'mx-2 h-0.5 flex-1',
            )}
          />
        );
        return (
          <li
            key={stage.id}
            aria-current={stage.state === 'current' ? 'step' : undefined}
            className={cn(
              'min-w-0',
              isVertical ? 'grid grid-cols-[32px_minmax(0,1fr)] gap-3.5' : 'flex flex-col gap-2.5',
            )}
          >
            <div className={cn('flex items-center', isVertical && 'flex-col')}>
              <span className={markVariants({ state: stage.state })}>
                <Icon aria-hidden />
              </span>
              {line}
            </div>
            <div className={cn('flex flex-col gap-0.5', isVertical ? 'pt-1 pb-4.5' : 'pr-3')}>
              <span className={stateTextVariants({ state: stage.state })}>
                {stage.stateText ?? t(`stageTimeline.state.${stage.state}`)}
              </span>
              <strong
                className={cn(
                  'leading-[1.3] font-bold',
                  isVertical ? 'text-body' : 'text-body-sm',
                  stage.state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground',
                  stage.state === 'cancelled' && 'line-through',
                )}
              >
                {stage.label}
              </strong>
              {stage.meta ? (
                <span className="text-meta text-muted-foreground tabular-nums">{stage.meta}</span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
