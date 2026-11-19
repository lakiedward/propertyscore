import { createLink, type LinkComponent } from '@tanstack/react-router';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { textLinkVariants } from '@/components/navigation/text-link-variants';
import { cn } from '@/lib/utils';

type ArrowLinkAnchorProps = ComponentProps<'a'> & {
  direction: 'back' | 'forward';
};

const CreatedArrowLink = createLink(ArrowLinkAnchor);

export const ArrowLink: LinkComponent<typeof ArrowLinkAnchor> = (props) => (
  <CreatedArrowLink {...props} />
);

function ArrowLinkAnchor({ direction, className, children, ...props }: ArrowLinkAnchorProps) {
  const icon =
    direction === 'back' ? (
      <ArrowLeftIcon aria-hidden className="size-4" />
    ) : (
      <ArrowRightIcon aria-hidden className="size-4" />
    );

  return (
    <a
      className={cn(
        textLinkVariants(),
        'touch-target inline-flex items-center gap-1.5 self-start py-1',
        className,
      )}
      {...props}
    >
      {direction === 'back' ? icon : null}
      {children}
      {direction === 'forward' ? icon : null}
    </a>
  );
}
