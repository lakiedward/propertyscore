import { cva } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REPORT_HUES, type ReportHue } from './report-hues';

const tileVariants = cva('grid shrink-0 place-items-center', {
  variants: {
    size: {
      sm: 'size-7.5 rounded-[9px]',
      md: 'size-9 rounded-[9px]',
      lg: 'size-11 rounded-icon',
    },
  },
  defaultVariants: { size: 'md' },
});

const iconVariants = cva('', {
  variants: {
    size: {
      sm: 'size-4',
      md: 'size-4.5',
      lg: 'size-5.5',
    },
  },
  defaultVariants: { size: 'md' },
});

type ReportIconTileProps = {
  icon: LucideIcon;
  hue: ReportHue;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function ReportIconTile({ icon: Icon, hue, size, className }: ReportIconTileProps) {
  const colors = REPORT_HUES[hue];
  return (
    <span
      aria-hidden="true"
      className={cn(tileVariants({ size }), colors.surface, colors.text, className)}
    >
      <Icon className={iconVariants({ size })} />
    </span>
  );
}
