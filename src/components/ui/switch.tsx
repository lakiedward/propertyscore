import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer group/switch relative inline-flex h-7 w-11.5 shrink-0 items-center rounded-full bg-control-off transition-colors duration-(--duration-fast) outline-none after:absolute after:-inset-x-1 after:-inset-y-2 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[state=checked]:bg-primary',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5.5 translate-x-0.75 rounded-full bg-card shadow-sm transition-transform duration-(--duration-base) ease-standard data-[state=checked]:translate-x-5.25"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
