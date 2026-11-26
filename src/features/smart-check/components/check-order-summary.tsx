import { CheckIcon, MapPinIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '@/i18n/format';

const SUMMARY_ITEMS = ['scores', 'market', 'nearby', 'account'] as const;

type CheckOrderSummaryProps = {
  address: string;
  priceRon: number | null;
};

export function CheckOrderSummary({ address, priceRon }: CheckOrderSummaryProps) {
  const { t, i18n } = useTranslation('smartCheck');
  const price = priceRon === null ? null : formatPrice(priceRon, 'RON', i18n.resolvedLanguage);

  return (
    <aside
      aria-labelledby="check-summary-title"
      className="overflow-hidden rounded-lg border border-card bg-card shadow-card-soft"
    >
      <div className="flex flex-col gap-2 bg-info px-5 py-4.5 text-info-foreground">
        <p className="text-meta font-extrabold tracking-label text-cta uppercase">
          {t('check.summary.eyebrow')}
        </p>
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="check-summary-title" className="text-h4 font-bold">
            {t('common:brand.smartcheck')}
          </h2>
          {price !== null ? (
            <span className="text-h4 font-extrabold tabular-nums">{price}</span>
          ) : null}
        </div>
        <p className="flex items-start gap-2 text-small text-on-info-soft">
          <MapPinIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 break-words">{address}</span>
        </p>
      </div>
      <div className="flex flex-col gap-2.5 border-b border-border-subtle px-5 py-4">
        <h3 className="text-small font-extrabold">{t('check.summary.includesTitle')}</h3>
        <ul className="flex flex-col gap-2">
          {SUMMARY_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-body-sm">
              <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              {t(`check.summary.items.${item}`)}
            </li>
          ))}
        </ul>
        <p className="text-small text-muted-foreground">{t('check.summary.note')}</p>
      </div>
      {price !== null ? (
        <dl className="flex flex-col gap-3 px-5 py-4">
          <div className="flex justify-between gap-4 border-b border-border-subtle pb-3 text-body-sm text-muted-foreground">
            <dt>{t('check.summary.subtotal')}</dt>
            <dd className="text-foreground tabular-nums">{price}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-body font-bold">{t('check.summary.total')}</dt>
            <dd className="text-title-sm font-extrabold tabular-nums">{price}</dd>
          </div>
        </dl>
      ) : null}
      {priceRon !== null && priceRon > 0 ? (
        <p className="px-5 pb-4 text-meta text-muted-foreground">{t('check.summary.vat')}</p>
      ) : null}
    </aside>
  );
}
