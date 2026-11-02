import { Trans, useTranslation } from 'react-i18next';
import { ProductTag } from '@/components/brand/product-tag';
import { PricingComparison, type ComparisonValue } from '@/components/property/pricing-comparison';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import { useBrandNames } from '../hooks/use-brand-names';

const COMPARISON_ROWS = [
  { id: 'area', physical: 'yes', smartCheck: 'yes' },
  { id: 'visit', physical: 'yes', smartCheck: 'no' },
  { id: 'issues', physical: 'yes', smartCheck: 'no' },
  { id: 'media', physical: 'yes', smartCheck: 'no' },
  { id: 'listing', physical: 'yes', smartCheck: 'partial' },
] as const satisfies readonly {
  id: string;
  physical: ComparisonValue;
  smartCheck: ComparisonValue;
}[];

const PHYSICAL_COLUMN = 'physical';
const SMART_CHECK_COLUMN = 'smartCheck';

export function ServiceComparison() {
  const { t } = useTranslation('home');
  const brands = useBrandNames();
  const physicalPrice = formatPrice(
    SERVICE_PRICES.physical.amount,
    SERVICE_PRICES.physical.currency,
  );
  const smartCheckPrice = formatPrice(
    SERVICE_PRICES.smartCheck.amount,
    SERVICE_PRICES.smartCheck.currency,
  );

  return (
    <div className="mt-3.75 flex flex-col rounded-xl border border-border bg-card p-7">
      <h3 className="text-h3 font-extrabold tracking-[-0.025em] text-brand">
        {t('pricing.comparison.title')}
      </h3>
      <p className="mt-1.5 mb-5.5 max-w-160 text-body text-muted-foreground">
        <Trans
          t={t}
          i18nKey="pricing.comparison.intro"
          values={brands}
          components={{ strong: <strong className="font-bold text-foreground" /> }}
        />
      </p>
      <PricingComparison
        caption={t('pricing.comparison.label', brands)}
        featureHeader={t('pricing.comparison.featureColumn')}
        valueLabels={{
          yes: t('pricing.comparison.values.yes'),
          no: t('pricing.comparison.values.no'),
          partial: t('pricing.comparison.values.partial'),
        }}
        columns={[
          {
            key: PHYSICAL_COLUMN,
            tone: 'physical',
            header: (
              <span className="flex flex-wrap items-center justify-between gap-2">
                <ProductTag product="physical" />
                <span className="text-label whitespace-nowrap text-brand">{physicalPrice}</span>
              </span>
            ),
          },
          {
            key: SMART_CHECK_COLUMN,
            tone: 'online',
            header: (
              <span className="flex flex-wrap items-center justify-between gap-2">
                <ProductTag product="smartcheck" />
                <span className="text-label whitespace-nowrap text-info">{smartCheckPrice}</span>
              </span>
            ),
          },
        ]}
        rows={COMPARISON_ROWS.map((row) => ({
          key: row.id,
          label: t(`pricing.comparison.rows.${row.id}.label`),
          cells: [
            {
              value: row.physical,
              text: t(`pricing.comparison.rows.${row.id}.physical`, brands),
            },
            { value: row.smartCheck, text: t(`pricing.comparison.rows.${row.id}.smartCheck`) },
          ],
        }))}
      />
    </div>
  );
}
