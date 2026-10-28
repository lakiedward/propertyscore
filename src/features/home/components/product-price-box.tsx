import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ProductPriceBoxProps = {
  product: 'physical' | 'smartcheck';
  label: string;
  name: string;
  kind: string;
  price: string;
  footer: ReactNode;
  ctaLabel: string;
  ctaHash: string;
};

export function ProductPriceBox({
  product,
  label,
  name,
  kind,
  price,
  footer,
  ctaLabel,
  ctaHash,
}: ProductPriceBoxProps) {
  const isPhysical = product === 'physical';

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex flex-col overflow-hidden rounded-xl text-on-inverse shadow-md',
        isPhysical ? 'bg-surface-inverse' : 'bg-info',
      )}
    >
      <div className="flex items-center gap-3 p-5">
        <BrandMark product={product} tone={isPhysical ? 'color' : 'inverse'} size={44} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-label">{name}</span>
          <span className="text-caption text-on-inverse-muted">{kind}</span>
        </div>
        <span className="text-price-lg text-cta">{price}</span>
      </div>
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 px-5 py-3.5',
          isPhysical ? 'bg-primary-pressed' : 'bg-info-hover',
        )}
      >
        <span className="text-caption text-on-inverse-muted">{footer}</span>
        <Button asChild variant="inverse" shape="pill" size="sm">
          <Link to="/" hash={ctaHash}>
            {ctaLabel}
            <ArrowRightIcon aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
