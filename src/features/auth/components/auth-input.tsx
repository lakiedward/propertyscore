import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const authInputVariants = cva(
  'rounded-md border-border bg-card placeholder:text-muted-foreground aria-invalid:ring-0',
  {
    variants: {
      look: {
        auth: 'h-14 px-4 text-body md:text-body short:h-12',
        settings:
          'h-control px-(--control-padding-x) text-(length:--control-font-size) md:text-(length:--control-font-size)',
      },
    },
    defaultVariants: { look: 'auth' },
  },
);

type AuthInputLook = NonNullable<VariantProps<typeof authInputVariants>['look']>;

type AuthInputProps = ComponentProps<typeof Input> & { look?: AuthInputLook };

export function AuthInput({ className, look, ...props }: AuthInputProps) {
  return <Input className={cn(authInputVariants({ look }), className)} {...props} />;
}
