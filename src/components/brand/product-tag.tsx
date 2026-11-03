import { cva } from 'class-variance-authority';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BrandMark } from './brand-mark';

const productTagVariants = cva('h-7 gap-1.5 rounded-full border pr-2.5 pl-1 text-meta font-bold', {
  variants: {
    product: {
      physical: 'border-transparent bg-trust-physical text-trust-physical-foreground',
      smartcheck: 'border-trust-online-border bg-trust-online text-trust-online-foreground',
    },
  },
});

type ProductTagProps = {
  product: 'physical' | 'smartcheck';
  className?: string;
};

export function ProductTag({ product, className }: ProductTagProps) {
  const { t } = useTranslation();

  return (
    <Badge className={cn(productTagVariants({ product }), className)}>
      <BrandMark product={product} size={20} />
      {t(`brand.${product}`)}
    </Badge>
  );
}
