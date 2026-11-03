import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const sectionTitleVariants = cva('', {
  variants: {
    size: {
      section: 'text-section leading-[1.1] font-title tracking-title',
      product: 'text-section',
      band: 'text-band',
      physical: 'text-[34px] leading-[1.12] font-title tracking-title w520:text-section-sm',
      deliverables: 'text-[clamp(34px,3.4vw,52px)] leading-[1.1] font-title tracking-title',
      listings:
        'text-[clamp(34px,3.6vw,54px)] leading-[1.08] font-title tracking-section text-balance',
      partners: 'text-[clamp(36px,4vw,60px)] leading-[1.05] font-title tracking-section',
      panel: 'text-[clamp(27px,2.75vw,37px)] leading-[1.13] font-[710] tracking-title',
      card: 'text-[clamp(24px,2.4vw,30px)] leading-[1.15] font-extrabold tracking-[-0.025em] text-balance',
    },
  },
  defaultVariants: { size: 'section' },
});

type SectionTitleProps = VariantProps<typeof sectionTitleVariants> & {
  lead: ReactNode;
  accent: ReactNode;
  as?: 'h2' | 'h3';
  id?: string;
  className?: string;
  accentClassName?: string;
};

export function SectionTitle({
  lead,
  accent,
  as: Heading = 'h2',
  id,
  size,
  className,
  accentClassName,
}: SectionTitleProps) {
  return (
    <Heading id={id} className={cn(sectionTitleVariants({ size }), className)}>
      <span className="block">{lead}</span>
      <span className={cn('block', accentClassName)}>{accent}</span>
    </Heading>
  );
}
