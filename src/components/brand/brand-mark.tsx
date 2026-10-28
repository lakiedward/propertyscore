import { cva, type VariantProps } from 'class-variance-authority';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { BRAND_MARKS, type BrandProduct, type BrandTone } from './brand-marks';

const brandMarkVariants = cva('block shrink-0', {
  variants: {
    size: {
      16: 'size-4',
      20: 'size-5',
      24: 'size-6',
      28: 'size-7',
      32: 'size-8',
      34: 'size-8.5',
      44: 'size-11',
      48: 'size-12',
      52: 'size-13',
      64: 'size-16',
    },
  },
  defaultVariants: {
    size: 32,
  },
});

type BrandMarkProps = VariantProps<typeof brandMarkVariants> & {
  product?: BrandProduct;
  tone?: BrandTone;
  isDecorative?: boolean;
  className?: string;
};

export function BrandMark({
  product = 'core',
  tone = 'color',
  size,
  isDecorative = true,
  className,
}: BrandMarkProps) {
  const { t } = useTranslation();

  return (
    <svg
      viewBox="0 0 48 48"
      className={cn(brandMarkVariants({ size }), className)}
      role={isDecorative ? undefined : 'img'}
      aria-hidden={isDecorative ? true : undefined}
      aria-label={isDecorative ? undefined : t(`brand.${product}`)}
      focusable="false"
    >
      {BRAND_MARKS[product][tone].map((part) => (
        <path
          key={part.d + part.className}
          d={part.d}
          className={part.className}
          strokeWidth={part.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
