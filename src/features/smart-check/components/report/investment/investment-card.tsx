import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type InvestmentCardProps = {
  eyebrow: ReactNode;
  title?: ReactNode;
  titleId?: string;
  children: ReactNode;
  className?: string;
};

export function InvestmentCard({
  eyebrow,
  title,
  titleId,
  children,
  className,
}: InvestmentCardProps) {
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'min-w-0 rounded-icon border border-border bg-card p-4 shadow-report-card w760:px-6.5 w760:py-6',
        className,
      )}
    >
      <p className="text-meta font-extrabold tracking-label text-primary uppercase">{eyebrow}</p>
      {title ? (
        <h3
          id={titleId}
          className="mt-1 text-[19px] leading-tight font-extrabold tracking-[-0.02em] w760:text-[21px]"
        >
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
}
