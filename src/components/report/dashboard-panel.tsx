import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type DashboardPanelProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  isFlush?: boolean;
  isScrollable?: boolean;
  className?: string;
  children: ReactNode;
};

export function DashboardPanel({
  title,
  subtitle,
  actions,
  toolbar,
  isFlush = false,
  isScrollable = false,
  className,
  children,
}: DashboardPanelProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'flex min-w-0 flex-col rounded-lg border border-card bg-card shadow-card-soft',
        className,
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-(--card-padding) py-4',
          toolbar ? 'min-h-19' : undefined,
        )}
      >
        <div className="flex flex-col gap-0.5">
          <h2 id={titleId} className="text-title-3xs leading-snug font-bold">
            {title}
          </h2>
          {subtitle ? <span className="text-meta text-muted-foreground">{subtitle}</span> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {toolbar ? (
        <div className="border-b border-border-subtle px-(--card-padding) py-3.5">{toolbar}</div>
      ) : null}
      <div
        className={cn(
          !isFlush && 'p-(--card-padding)',
          isScrollable && 'min-h-0 flex-1 overflow-y-auto overscroll-contain',
        )}
      >
        {children}
      </div>
    </section>
  );
}
