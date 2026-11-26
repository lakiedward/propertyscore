import { cn } from '@/lib/utils';
import { readableInk } from '../../../accessibility.utils';

type LineChipProps = {
  reference: string;
  colour: string | null;
  className?: string;
};

export function LineChip({ reference, colour, className }: LineChipProps) {
  const background = colour ?? 'var(--report-industry)';
  return (
    <span
      className={cn(
        'inline-grid h-5 min-w-6 place-items-center rounded-[7px] px-1.25 text-[12px] leading-none font-extrabold tabular-nums',
        className,
      )}
      style={{ backgroundColor: background, color: readableInk(colour) }}
    >
      {reference}
    </span>
  );
}
