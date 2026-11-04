import { createLink, type LinkComponent } from '@tanstack/react-router';
import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowRightIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const pillLinkVariants = cva(
  'touch-target inline-flex items-center rounded-full py-0 font-extrabold transition-colors duration-(--duration-fast) focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:outline-none',
  {
    variants: {
      tone: {
        forest:
          'bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring focus-visible:ring-offset-background',
        cta: 'bg-cta text-brand hover:bg-cta-hover focus-visible:ring-focus-inverse focus-visible:ring-offset-surface-inverse',
        info: 'bg-info text-info-foreground hover:bg-info-hover focus-visible:ring-ring focus-visible:ring-offset-background',
        inverse:
          'bg-card text-info focus-visible:ring-focus-inverse focus-visible:ring-offset-info',
        inverseAccent:
          'bg-card text-info focus-visible:ring-focus-inverse focus-visible:ring-offset-info',
      },
      size: {
        sm: 'min-h-10 gap-2 pr-1.5 pl-3.5 text-small',
        md: 'min-h-12.5 gap-3 pr-2 pl-5 text-label',
      },
    },
    defaultVariants: { tone: 'forest', size: 'md' },
  },
);

const bubbleVariants = cva('grid shrink-0 place-items-center rounded-full', {
  variants: {
    tone: {
      forest: 'bg-cta text-brand',
      cta: 'bg-primary text-cta',
      info: 'bg-card text-info',
      inverse: 'bg-info text-info-foreground',
      inverseAccent: 'bg-cta text-info-ink',
    },
    size: {
      sm: 'size-7 [&_svg]:size-3.5',
      md: 'size-9 [&_svg]:size-4',
    },
  },
  defaultVariants: { tone: 'forest', size: 'md' },
});

type PillLinkAnchorProps = ComponentProps<'a'> & VariantProps<typeof pillLinkVariants>;

const CreatedPillLink = createLink(PillLinkAnchor);

export const PillLink: LinkComponent<typeof PillLinkAnchor> = (props) => (
  <CreatedPillLink {...props} />
);

function PillLinkAnchor({ tone, size, className, children, ...props }: PillLinkAnchorProps) {
  return (
    <a className={cn(pillLinkVariants({ tone, size }), className)} {...props}>
      {children}
      <span aria-hidden="true" className={bubbleVariants({ tone, size })}>
        <ArrowRightIcon aria-hidden />
      </span>
    </a>
  );
}
