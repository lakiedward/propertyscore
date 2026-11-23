import { ChevronRightIcon, InfoIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ChapterSourcesProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function ChapterSources({ title, children, className }: ChapterSourcesProps) {
  return (
    <details
      className={cn(
        'group rounded-icon border border-border bg-card shadow-report-card open:shadow-report-panel',
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-icon px-5 py-4 text-[16px] font-extrabold marker:hidden focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <InfoIcon aria-hidden className="size-4.5 text-muted-foreground" />
        {title}
        <ChevronRightIcon
          aria-hidden
          className="ml-auto size-4.5 text-muted-foreground transition-transform duration-(--duration-fast) group-open:rotate-90"
        />
      </summary>
      <div className="grid gap-2.5 px-5 pb-5 text-[14.5px] leading-normal text-muted-foreground [&_b]:font-bold [&_b]:text-foreground">
        {children}
      </div>
    </details>
  );
}
