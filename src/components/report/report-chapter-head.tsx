import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { REPORT_HUES, type ReportHue } from './report-hues';

type ReportChapterHeadProps = {
  hue: ReportHue;
  eyebrow: ReactNode;
  badge?: string;
  title: ReactNode;
  titleId?: string;
  lead?: ReactNode;
  isEyebrowColored?: boolean;
  className?: string;
};

export function ReportChapterHead({
  hue,
  eyebrow,
  badge,
  title,
  titleId,
  lead,
  isEyebrowColored = false,
  className,
}: ReportChapterHeadProps) {
  const colors = REPORT_HUES[hue];
  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex flex-wrap items-center gap-2.5 text-meta font-extrabold tracking-label text-muted-foreground uppercase">
        <span className={cn(isEyebrowColored && colors.text)}>{eyebrow}</span>
        {badge ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 font-bold tracking-normal normal-case">
            <i aria-hidden="true" className={cn('size-1.75 rounded-full', colors.fill)} />
            {badge}
          </span>
        ) : null}
      </div>
      <h2
        id={titleId}
        className="mt-2.5 max-w-[22ch] text-[clamp(28px,3.4vw,42px)] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance"
      >
        {title}
      </h2>
      {lead ? (
        <p className="mt-3 max-w-[62ch] text-lead-sm leading-copy text-muted-foreground">{lead}</p>
      ) : null}
    </div>
  );
}
