import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LoadMoreButtonProps = {
  label: string;
  isLoading: boolean;
  onLoadMore: () => void;
  variant?: 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'default';
  className?: string;
};

export function LoadMoreButton({
  label,
  isLoading,
  onLoadMore,
  variant = 'outline',
  size = 'md',
  className,
}: LoadMoreButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={isLoading}
      aria-busy={isLoading}
      onClick={onLoadMore}
      className={cn('touch-target', className)}
    >
      {label}
    </Button>
  );
}
