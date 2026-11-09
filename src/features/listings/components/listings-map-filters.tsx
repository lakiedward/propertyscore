import { RotateCcwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EXPLORER_CITIES,
  EXPLORER_PRICE_CAP_CURRENCY,
  EXPLORER_PRICE_CAPS,
  type ExplorerCityId,
} from '@/config/listings-explorer';
import { formatPrice } from '@/i18n/format';
import { oneOf } from '@/lib/utils';
import type { ListingTransaction } from '../listing.types';
import { TransactionSwitch } from './transaction-switch';

const ALL_ROMANIA = 'ro';
const ANY_PRICE = 'any';

const SELECT_TRIGGER_CLASS =
  'h-11 rounded-md border-border px-3 text-[13px] font-bold text-brand max-w760:min-w-0 max-w760:flex-1';

type ListingsMapFiltersProps = {
  transaction: ListingTransaction;
  cityId: ExplorerCityId | undefined;
  maxPrice: number | undefined;
  shownCount: number | undefined;
  canReset: boolean;
  onTransactionChange: (transaction: ListingTransaction) => void;
  onCityChange: (cityId: ExplorerCityId | undefined) => void;
  onMaxPriceChange: (maxPrice: number | undefined) => void;
  onReset: () => void;
};

export function ListingsMapFilters({
  transaction,
  cityId,
  maxPrice,
  shownCount,
  canReset,
  onTransactionChange,
  onCityChange,
  onMaxPriceChange,
  onReset,
}: ListingsMapFiltersProps) {
  const { t } = useTranslation('listings');
  const caps = EXPLORER_PRICE_CAPS[transaction];
  const cityIds = EXPLORER_CITIES.map((city) => city.id);

  return (
    <div className="absolute top-3.5 left-3.5 z-10 flex max-w-[calc(100%-250px)] flex-col items-start gap-2 max-w760:right-3.5 max-w760:max-w-none">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-1.5 shadow-map-bar max-w760:w-full">
        <TransactionSwitch
          variant="segment"
          value={transaction}
          onChange={onTransactionChange}
          label={t('explore.filters.transactionLabel')}
        />
        <Select
          value={cityId ?? ALL_ROMANIA}
          onValueChange={(value) => {
            onCityChange(oneOf(cityIds, value));
          }}
        >
          <SelectTrigger
            aria-label={t('explore.filters.cityLabel')}
            className={SELECT_TRIGGER_CLASS}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ROMANIA}>{t('explore.filters.allRomania')}</SelectItem>
            {EXPLORER_CITIES.map((city) => (
              <SelectItem key={city.id} value={city.id}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={maxPrice === undefined ? ANY_PRICE : String(maxPrice)}
          onValueChange={(value) => {
            const cap = caps.find((candidate) => String(candidate) === value);
            onMaxPriceChange(cap);
          }}
        >
          <SelectTrigger
            aria-label={t('explore.filters.priceLabel')}
            className={SELECT_TRIGGER_CLASS}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_PRICE}>
              {t(`explore.filters.anyPrice.${transaction}`)}
            </SelectItem>
            {caps.map((cap) => (
              <SelectItem key={cap} value={String(cap)}>
                {t(`explore.filters.priceCap.${transaction}`, {
                  price: formatPrice(cap, EXPLORER_PRICE_CAP_CURRENCY),
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canReset ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-error-border bg-card px-3.5 text-[13px] font-action whitespace-nowrap text-destructive transition-colors duration-(--duration-fast) hover:bg-error-surface focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
          >
            <RotateCcwIcon aria-hidden className="size-5" />
            {t('explore.filters.reset')}
          </button>
        ) : null}
      </div>
      <p
        aria-live="polite"
        className="rounded-full bg-map-count px-3 py-1.5 text-meta font-control text-primary-foreground shadow-map-count empty:hidden"
      >
        {shownCount === undefined ? null : t('explore.shown', { count: shownCount })}
      </p>
    </div>
  );
}
