import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const accentVariants = cva('block', {
  variants: {
    tone: {
      brand: 'text-brand',
      info: 'text-info',
      muted: 'text-muted-foreground',
      green: 'text-category-green',
      onInverse: 'text-cta',
    },
  },
});

type SectionHeadingProps = {
  id?: string;
  lead: string;
  accent: string;
  tone?: 'brand' | 'info' | 'muted' | 'green' | 'onInverse';
  as?: 'h2' | 'h3';
  className?: string;
};

export function SectionHeading({
  id,
  lead,
  accent,
  tone = 'brand',
  as: Heading = 'h2',
  className,
}: SectionHeadingProps) {
  return (
    <Heading
      id={id}
      className={cn(
        Heading === 'h2' ? 'text-section text-balance' : 'text-h2 text-balance',
        className,
      )}
    >
      <span className="block">{lead}</span>
      <span className={accentVariants({ tone })}>{accent}</span>
    </Heading>
  );
}
