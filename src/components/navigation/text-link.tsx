import { createLink, type LinkComponent } from '@tanstack/react-router';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { textLinkVariants } from './text-link-variants';

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
