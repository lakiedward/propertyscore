import { Link } from '@tanstack/react-router';
import { cva } from 'class-variance-authority';
import { ArrowUpRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const serviceCardVariants = cva(
  'group flex flex-col gap-4 rounded-xl p-5 shadow-md transition-transform duration-(--duration-fast) ease-standard hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:p-6',
  {
    variants: {
      tone: {
        forest: 'bg-surface-inverse text-on-inverse',
        online: 'bg-info text-info-foreground',
      },
    },
  },
);

const arrowVariants = cva(
  'grid size-9 shrink-0 place-items-center rounded-full border transition-colors duration-(--duration-fast)',
  {
    variants: {
      tone: {
        forest:
          'border-on-inverse/40 group-hover:border-cta group-hover:bg-cta group-hover:text-cta-foreground',
        online:
          'border-on-inverse/40 group-hover:border-card group-hover:bg-card group-hover:text-info',
      },
    },
  },
);

type ServiceCardProps = {
  tone: 'forest' | 'online';
  hash: string;
  brand: ReactNode;
  price: string;
  extra?: ReactNode;
  children: ReactNode;
  action: string;
};

export function ServiceCard({
  tone,
  hash,
  brand,
  price,
  extra,
  children,
  action,
}: ServiceCardProps) {
  return (
    <Link to="/" hash={hash} className={cn(serviceCardVariants({ tone }))}>
      <span className="flex items-start justify-between gap-3">
        {brand}
        <span className="text-price text-on-inverse">{price}</span>
      </span>
      {extra}
      <span className="text-small text-on-inverse-muted">{children}</span>
      <span className="mt-auto flex items-center justify-end gap-3 text-small font-bold">
        {action}
        <span className={arrowVariants({ tone })} aria-hidden="true">
          <ArrowUpRightIcon className="size-4" />
        </span>
      </span>
    </Link>
  );
}
