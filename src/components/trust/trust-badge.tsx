import { cva } from 'class-variance-authority';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';

const trustBadgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border font-bold whitespace-nowrap',
  {
    variants: {
      kind: {
        physical: 'border-transparent bg-trust-physical text-trust-physical-foreground',
        online: 'border-transparent bg-info text-info-foreground',
        none: 'border-dashed border-trust-none-border bg-card text-trust-none-foreground',
      },
      size: {
        sm: 'h-6 pr-2.5 pl-1 text-meta',
        md: 'h-8 pr-3 pl-1.5 text-caption',
      },
    },
    compoundVariants: [
      { kind: 'none', size: 'sm', className: 'pl-2.5' },
      { kind: 'none', size: 'md', className: 'pl-3' },
    ],
  },
);

type TrustBadgeProps = {
  kind: 'physical' | 'online' | 'none';
  score?: number | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
};

export function TrustBadge({ kind, score, size = 'sm', className }: TrustBadgeProps) {
  const { t } = useTranslation();
  const markSize = size === 'sm' ? 16 : 20;
  const label =
    kind === 'physical'
      ? t('trust.physical')
      : kind === 'online'
        ? t('trust.smartcheck', { score: score ?? 0 })
        : t('trust.none');

  return (
    <span className={cn(trustBadgeVariants({ kind, size }), className)}>
      <span className="sr-only">{label}</span>
      {kind === 'physical' ? <BrandMark product="physical" size={markSize} /> : null}
      {kind === 'online' ? <BrandMark product="smartcheck" tone="inverse" size={markSize} /> : null}
      <span aria-hidden="true">
        {kind === 'physical'
          ? t('trust.physicalShort')
          : kind === 'online'
            ? t('trust.smartcheckShort')
            : t('trust.noneShort')}
      </span>
      {kind === 'online' && score != null ? (
        <span aria-hidden="true" className="rounded-full bg-on-inverse/20 px-1.5 tabular-nums">
          {formatNumber(score)}
        </span>
      ) : null}
    </span>
  );
}
