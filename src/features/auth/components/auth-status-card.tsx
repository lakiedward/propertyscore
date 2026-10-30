import { CircleCheckIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AuthStatusCardProps = {
  tone?: 'brand' | 'success';
  eyebrow: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function AuthStatusCard({
  tone = 'brand',
  eyebrow,
  title,
  children,
  actions,
}: AuthStatusCardProps) {
  const isSuccess = tone === 'success';

  return (
    <div
      role={isSuccess ? 'status' : undefined}
      className="flex flex-col gap-3.5 rounded-status border border-border bg-card p-7"
    >
      <p
        className={cn(
          'inline-flex items-center gap-2.25 text-meta leading-[1.55] font-[760] tracking-[0.06em] uppercase',
          isSuccess ? 'text-success' : 'text-brand',
        )}
      >
        {isSuccess ? (
          <CircleCheckIcon aria-hidden className="size-4" />
        ) : (
          <span aria-hidden="true" className="size-2 rounded-full bg-current" />
        )}
        {eyebrow}
      </p>
      <h2 className="text-[28px] leading-[1.1] font-[740] tracking-[-0.04em] text-foreground">
        {title}
      </h2>
      {children}
      {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
    </div>
  );
}
