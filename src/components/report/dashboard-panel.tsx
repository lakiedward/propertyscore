import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type DashboardPanelProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  isFlush?: boolean;
  className?: string;
  children: ReactNode;
};

export function DashboardPanel({
  title,
  subtitle,
  actions,
  isFlush = false,
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-(--card-padding) py-4">
        <div className="flex flex-col gap-0.5">
          <h2 id={titleId} className="text-[17px] leading-snug font-bold">
            {title}
          </h2>
          {subtitle ? <span className="text-meta text-muted-foreground">{subtitle}</span> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className={isFlush ? undefined : 'p-(--card-padding)'}>{children}</div>
    </section>
  );
}
