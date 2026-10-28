import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { SplitPrice } from '@/components/property/split-price';
import type { Currency } from '@/i18n/format';
import { cn } from '@/lib/utils';

type ProductPriceBoxProps = {
  product: 'physical' | 'smartcheck';
  label: string;
  kind: string;
  amount: number;
  currency: Currency;
  footer: ReactNode;
  ctaLabel: string;
  ctaHash: string;
};

export function ProductPriceBox({
  product,
  label,
  kind,
  amount,
  currency,
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
        'w-full overflow-hidden rounded-xl text-on-inverse',
        isPhysical ? 'bg-primary' : 'bg-info',
      )}
    >
      <div className="flex items-center gap-3 px-5 py-4.5">
        <BrandMark product={product} tone={isPhysical ? 'color' : 'inverse'} size={40} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <Logo product={product} tone="inverse" size="md" hasMark={false} isDecorative />
          <small
            className={cn(
              'text-caption',
              isPhysical ? 'text-on-inverse-faint' : 'text-on-info-muted',
            )}
          >
            {kind}
          </small>
        </span>
        <SplitPrice
          amount={amount}
          currency={currency}
          className={cn('text-price-box', isPhysical && 'text-cta')}
          currencyClassName="text-small font-bold tracking-normal text-on-inverse"
        />
      </div>
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-t border-on-inverse/10 py-3 pr-3.5 pl-5',
          isPhysical ? 'bg-primary-deep' : 'bg-info-ink-muted',
        )}
      >
        <span
          className={cn(
            'text-caption font-semibold',
            isPhysical ? 'text-on-inverse-soft' : 'text-on-info-muted',
          )}
        >
          {footer}
        </span>
        <Link
          to="/"
          hash={ctaHash}
          className={cn(
            'inline-flex min-h-10 items-center gap-2 rounded-full py-0 pr-1.5 pl-3.5 text-small font-extrabold transition-colors duration-(--duration-fast) focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none',
            isPhysical ? 'bg-cta text-brand' : 'bg-card text-info',
          )}
        >
          {ctaLabel}
          <span
            aria-hidden="true"
            className={cn(
              'grid size-7 place-items-center rounded-full',
              isPhysical ? 'bg-primary text-cta' : 'bg-info text-on-inverse',
            )}
          >
            <ArrowRightIcon className="size-3.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
