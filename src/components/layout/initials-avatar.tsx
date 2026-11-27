import { cva, type VariantProps } from 'class-variance-authority';
import { initialsOf } from '@/lib/initials';
import { cn } from '@/lib/utils';

const avatarVariants = cva('grid shrink-0 place-items-center rounded-full font-extrabold', {
  variants: {
    size: {
      sm: 'size-7 text-nav-sm',
      md: 'size-8 text-meta',
      menu: 'size-8.5 text-caption leading-none',
      lg: 'size-10 text-small',
    },
    tone: {
      primary: 'bg-primary text-primary-foreground',
      soft: 'bg-secondary text-brand',
      cta: 'bg-cta text-cta-foreground',
      panel: 'bg-cta text-cta-foreground md:bg-primary md:text-primary-foreground',
    },
  },
  defaultVariants: { size: 'md', tone: 'primary' },
});

type InitialsAvatarProps = VariantProps<typeof avatarVariants> & {
  name: string;
  className?: string;
};

export function InitialsAvatar({ name, size, tone, className }: InitialsAvatarProps) {
  return (
    <span aria-hidden="true" className={cn(avatarVariants({ size, tone }), className)}>
      {initialsOf(name)}
    </span>
  );
}
