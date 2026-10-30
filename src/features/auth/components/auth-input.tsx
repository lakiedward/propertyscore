import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function AuthInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        'h-14 rounded-md border-border bg-card px-4 text-body placeholder:text-muted-foreground aria-invalid:ring-0 md:text-body short:h-12',
        className,
      )}
      {...props}
    />
  );
}
