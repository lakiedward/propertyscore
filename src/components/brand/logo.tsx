import { cva, type VariantProps } from 'class-variance-authority';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { BrandMark } from './brand-mark';
import type { BrandProduct, BrandTone } from './brand-marks';

const logoVariants = cva('inline-flex items-center font-brand leading-none whitespace-nowrap', {
  variants: {
    size: {
      xs: 'gap-1 text-logo-xs',
      sm: 'gap-1.5 text-logo-sm',
      md: 'gap-1.5 text-logo-md',
      lg: 'gap-3 text-logo-lg',
      xl: 'gap-3.5 text-logo-xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const MARK_SIZE = { xs: 20, sm: 28, md: 34, lg: 44, xl: 52 } as const;

const leadVariants = cva('tracking-brand', {
  variants: {
    product: {
      core: 'font-semibold',
      physical: 'font-semibold',
      smartcheck: 'font-medium',
    },
    tone: {
      color: '',
      inverse: 'text-on-inverse',
    },
  },
  compoundVariants: [
    { product: 'core', tone: 'color', className: 'text-brand' },
    { product: 'physical', tone: 'color', className: 'text-brand' },
    { product: 'smartcheck', tone: 'color', className: 'text-info' },
  ],
});

const markVariants = cva(
  'inline-block rounded-wordmark px-wordmark-x pt-wordmark-top pb-wordmark-bottom font-extrabold tracking-brand',
  {
    variants: {
      product: {
        core: '',
        physical: 'bg-cta text-cta-foreground',
        smartcheck: '',
      },
      tone: {
        color: '',
        inverse: '',
      },
    },
    compoundVariants: [
      { product: 'core', tone: 'color', className: 'bg-brand-highlight text-brand' },
      { product: 'core', tone: 'inverse', className: 'bg-cta text-cta-foreground' },
      { product: 'smartcheck', tone: 'color', className: 'bg-info text-info-foreground' },
      { product: 'smartcheck', tone: 'inverse', className: 'bg-card text-info' },
    ],
  },
);

type LogoProps = VariantProps<typeof logoVariants> & {
  product?: BrandProduct;
  tone?: BrandTone;
  hasMark?: boolean;
  isDecorative?: boolean;
  className?: string;
};

export function Logo({
  product = 'core',
  tone = 'color',
  size,
  hasMark = true,
  isDecorative = false,
  className,
}: LogoProps) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(logoVariants({ size }), className)}
      role={isDecorative ? undefined : 'img'}
      aria-label={isDecorative ? undefined : t(`brand.${product}`)}
      aria-hidden={isDecorative ? true : undefined}
    >
      {hasMark ? <BrandMark product={product} tone={tone} size={MARK_SIZE[size ?? 'md']} /> : null}
      <span className="inline-flex items-baseline gap-wordmark-gap" aria-hidden="true">
        <span className={leadVariants({ product, tone })}>
          {t(`brand.wordmark.${product}.lead`)}
        </span>
        <span className={markVariants({ product, tone })}>
          {t(`brand.wordmark.${product}.mark`)}
        </span>
      </span>
    </span>
  );
}
