import { cn } from '@/lib/utils';

const MEDIUM_FROM = 10;
const LARGE_FROM = 40;

type MapClusterProps = {
  count: number;
  label: string;
  accessibleName: string;
  onExpand: () => void;
};

function sizeClass(count: number): string {
  if (count >= LARGE_FROM) {
    return 'size-15 text-body';
  }
  return count >= MEDIUM_FROM ? 'size-12.5 text-small' : 'size-10.5 text-small';
}

export function MapCluster({ count, label, accessibleName, onExpand }: MapClusterProps) {
  return (
    <button
      type="button"
      aria-label={accessibleName}
      onClick={onExpand}
      className={cn(
        'grid place-items-center rounded-full bg-primary/88 font-display text-primary-foreground tabular-nums shadow-cluster focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none',
        sizeClass(count),
      )}
    >
      {label}
    </button>
  );
}
