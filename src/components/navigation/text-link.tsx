import { createLink, type LinkComponent } from '@tanstack/react-router';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const textLinkVariants = cva(
  'rounded-sm font-bold underline-offset-4 transition-colors duration-(--duration-fast) hover:underline focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:outline-none',
  {
    variants: {
      tone: {
        brand:
          'text-brand hover:text-link-hover focus-visible:ring-ring focus-visible:ring-offset-background',
        inverse:
          'text-on-inverse focus-visible:ring-focus-inverse focus-visible:ring-offset-surface-inverse',
      },
      size: {
        sm: 'text-small',
        md: 'text-body',
        inherit: '',
      },
    },
    defaultVariants: { tone: 'brand', size: 'sm' },
  },
);

type TextLinkAnchorProps = ComponentProps<'a'> & VariantProps<typeof textLinkVariants>;

const CreatedTextLink = createLink(TextLinkAnchor);

export const TextLink: LinkComponent<typeof TextLinkAnchor> = (props) => (
  <CreatedTextLink {...props} />
);

function TextLinkAnchor({ tone, size, className, children, ...props }: TextLinkAnchorProps) {
  return (
    <a className={cn(textLinkVariants({ tone, size }), className)} {...props}>
      {children}
    </a>
  );
}
