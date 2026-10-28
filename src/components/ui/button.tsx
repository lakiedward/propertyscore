import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Slot } from 'radix-ui';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent bg-clip-padding text-label whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-(--duration-fast) ease-standard outline-none select-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:border-disabled-border disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed',
        cta: 'bg-cta text-cta-foreground hover:bg-cta-hover active:bg-cta-pressed',
        info: 'bg-info text-info-foreground hover:bg-info-hover',
        inverse:
          'bg-card text-brand hover:bg-surface-alt focus-visible:ring-focus-inverse focus-visible:ring-offset-surface-inverse',
        outline:
          'border-brand bg-card text-brand hover:bg-surface-alt aria-expanded:bg-surface-alt',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-surface-alt',
        ghost: 'text-brand hover:bg-accent aria-expanded:bg-accent',
        destructive: 'bg-destructive text-primary-foreground hover:bg-destructive/90',
        link: 'h-auto px-0 text-brand underline-offset-4 hover:text-link-hover hover:underline',
      },
      size: {
        default: 'h-11 px-4.5',
        xs: "h-7 gap-1 px-2 text-meta [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 px-3.5 text-small [&_svg:not([class*='size-'])]:size-4",
        lg: 'h-13 px-6 text-body',
        icon: 'size-11',
        'icon-xs': "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        'icon-sm': "size-9 [&_svg:not([class*='size-'])]:size-4",
        'icon-lg': 'size-13',
      },
      shape: {
        default: '',
        pill: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  shape = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, shape, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
