import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import type { HomeSectionId } from '@/components/layout/site-navigation';
import { PillLink } from '@/components/navigation/pill-link';
import { SplitPrice } from '@/components/property/split-price';
import type { Currency } from '@/i18n/format';

type Product = 'physical' | 'smartcheck';

const boxVariants = cva('w-full overflow-hidden rounded-xl text-on-inverse', {
  variants: { product: { physical: 'bg-primary', smartcheck: 'bg-info' } },
});

const kindVariants = cva('text-caption', {
  variants: { product: { physical: 'text-on-inverse-faint', smartcheck: 'text-on-info-muted' } },
});

const amountVariants = cva('text-price-box', {
  variants: { product: { physical: 'text-cta', smartcheck: '' } },
});

const footerVariants = cva(
  'flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-t border-on-inverse/10 py-3 pr-3.5 pl-5',
  { variants: { product: { physical: 'bg-primary-deep', smartcheck: 'bg-info-ink-muted' } } },
);

const footerTextVariants = cva('text-caption font-semibold', {
  variants: { product: { physical: 'text-on-inverse-soft', smartcheck: 'text-on-info-muted' } },
});

const MARK_TONE = { physical: 'color', smartcheck: 'inverse' } as const satisfies Record<
  Product,
  'color' | 'inverse'
>;
const CTA_TONE = { physical: 'cta', smartcheck: 'inverse' } as const satisfies Record<
  Product,
  'cta' | 'inverse'
>;

type ProductPriceBoxProps = {
  product: Product;
  label: string;
  kind: string;
  amount: number;
  currency: Currency;
  footer: ReactNode;
  ctaLabel: string;
  ctaHash: HomeSectionId;
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
  return (
    <div role="group" aria-label={label} className={boxVariants({ product })}>
      <div className="flex items-center gap-3 px-5 py-4.5">
        <BrandMark product={product} tone={MARK_TONE[product]} size={40} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <Logo product={product} tone="inverse" size="md" hasMark={false} isDecorative />
          <small className={kindVariants({ product })}>{kind}</small>
        </span>
        <SplitPrice
          amount={amount}
          currency={currency}
          className={amountVariants({ product })}
          currencyClassName="text-small font-bold tracking-normal text-on-inverse"
        />
      </div>
      <div className={footerVariants({ product })}>
        <span className={footerTextVariants({ product })}>{footer}</span>
        <PillLink to="/" hash={ctaHash} tone={CTA_TONE[product]} size="sm">
          {ctaLabel}
        </PillLink>
      </div>
    </div>
  );
}
