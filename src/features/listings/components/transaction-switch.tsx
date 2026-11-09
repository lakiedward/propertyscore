import { useTranslation } from 'react-i18next';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { oneOf } from '@/lib/utils';
import type { ListingTransaction } from '../listing.types';

const TRANSACTIONS: readonly ListingTransaction[] = ['sale', 'rent'];

type TransactionSwitchProps = {
  value: ListingTransaction;
  onChange: (transaction: ListingTransaction) => void;
};

export function TransactionSwitch({ value, onChange }: TransactionSwitchProps) {
  const { t } = useTranslation('listings');

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        const transaction = oneOf(TRANSACTIONS, next);
        if (transaction && transaction !== value) {
          onChange(transaction);
        }
      }}
      aria-label={t('board.transactionLabel')}
      className="gap-1 rounded-full bg-surface-leaf p-1"
    >
      {TRANSACTIONS.map((option) => (
        <ToggleGroupItem
          key={option}
          value={option}
          className="h-10 rounded-full px-4 text-small font-bold text-brand data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {t(`transaction.${option}`)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
