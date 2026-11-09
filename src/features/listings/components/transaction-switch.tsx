import { cva } from 'class-variance-authority';
import { useTranslation } from 'react-i18next';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { oneOf } from '@/lib/utils';
import type { ListingTransaction } from '../listing.types';

const TRANSACTIONS: readonly ListingTransaction[] = ['sale', 'rent'];

const switchVariants = cva('', {
  variants: {
    variant: {
      pill: 'gap-1 rounded-full bg-surface-leaf p-1',
      segment: 'gap-0.75',
    },
  },
});

const optionVariants = cva('data-[state=on]:bg-primary data-[state=on]:text-primary-foreground', {
  variants: {
    variant: {
      pill: 'h-10 rounded-full px-4 text-small font-bold text-brand',
      segment: 'h-11 rounded-[6px] px-4.5 text-[13px] font-action text-ink-soft',
    },
  },
});

type TransactionSwitchProps = {
  value: ListingTransaction;
  onChange: (transaction: ListingTransaction) => void;
  label?: string;
  variant?: 'pill' | 'segment';
};

export function TransactionSwitch({
  value,
  onChange,
  label,
  variant = 'pill',
}: TransactionSwitchProps) {
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
      aria-label={label ?? t('board.transactionLabel')}
      className={switchVariants({ variant })}
    >
      {TRANSACTIONS.map((option) => (
        <ToggleGroupItem key={option} value={option} className={optionVariants({ variant })}>
          {t(`transaction.${option}`)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
