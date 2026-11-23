import { ArrowRightIcon, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REPORT_HUES, type ReportHue } from './report-hues';
import { ReportIconTile } from './report-icon-tile';

type NextChapterCardProps = {
  eyebrow: string;
  title: string;
  onOpen: () => void;
  className?: string;
} & (
  | { variant: 'featured'; icon: LucideIcon; hue: ReportHue; detail?: string; actionLabel: string }
  | { variant: 'forest' }
);

export function NextChapterCard(props: NextChapterCardProps) {
  const { eyebrow, title, onOpen, className } = props;

  if (props.variant === 'forest') {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'group flex w-full items-center justify-between gap-3 rounded-icon border border-primary bg-primary px-6 py-5 text-left text-primary-foreground shadow-report-card transition-[background-color,box-shadow,translate] duration-(--duration-fast) hover:-translate-y-0.5 hover:bg-primary-pressed hover:shadow-report-hover focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
          className,
        )}
      >
        <span className="flex flex-col">
          <small className="text-[11px] font-extrabold tracking-label text-cta uppercase">
            {eyebrow}
          </small>
          <b className="text-[22px] font-extrabold tracking-[-0.01em]">{title}</b>
        </span>
        <span
          aria-hidden="true"
          className="grid size-11 flex-none place-items-center rounded-full bg-cta text-cta-foreground transition-transform duration-(--duration-fast) ease-standard group-hover:translate-x-0.75"
        >
          <ArrowRightIcon className="size-5.5" />
        </span>
      </button>
    );
  }

  const hue = REPORT_HUES[props.hue];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group relative grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-4 overflow-hidden rounded-xl border border-border bg-card p-4 text-left text-foreground transition-[border-color,box-shadow,translate] duration-(--duration-fast) ease-standard hover:-translate-y-px hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none w760:grid-cols-[auto_minmax(0,1fr)_auto] w760:px-5.5 w760:py-4.5',
        hue.hoverBorder,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', hue.fill)} />
      <ReportIconTile icon={props.icon} hue={props.hue} size="lg" />
      <span className="flex min-w-0 flex-col">
        <small className="text-meta font-extrabold tracking-[0.07em] text-muted-foreground uppercase">
          {eyebrow}
        </small>
        <b className="mt-0.5 text-[20px] leading-tight font-extrabold tracking-[-0.01em]">
          {title}
        </b>
        {props.detail ? (
          <span className="mt-0.5 text-[13.5px] text-muted-foreground">{props.detail}</span>
        ) : null}
      </span>
      <span className="col-span-full inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4.5 text-small font-bold text-primary-foreground w760:col-span-1">
        {props.actionLabel}
        <ArrowRightIcon
          aria-hidden
          className="size-4 transition-transform duration-(--duration-fast) ease-standard group-hover:translate-x-0.75"
        />
      </span>
    </button>
  );
}
