import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type FactChipProps = {
  icon: LucideIcon;
  label: string;
  className?: string;
};

export function FactChip({ icon: Icon, label, className }: FactChipProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 rounded-full bg-background px-3 text-small text-foreground',
        className,
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      {label}
    </span>
  );
}
