import { Link } from '@tanstack/react-router';
import { cva } from 'class-variance-authority';
import { ArrowUpRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Currency } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { SplitPrice } from './split-price';

const serviceCardVariants = cva(
  'group block rounded-xl border px-5.5 pt-5 pb-4.5 transition-[transform,box-shadow] duration-(--duration-fast) ease-standard hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
  {
    variants: {
      tone: {
        forest:
          'border-primary bg-primary text-primary-foreground shadow-service hover:bg-primary-hover',
        online: 'border-info bg-info text-info-foreground',
      },
    },
  },
);

const priceVariants = cva('text-price-card', {
  variants: {
    tone: {
      forest: 'text-cta',
      online: 'text-info-foreground',
    },
  },
});

const textVariants = cva('mt-3 mb-2.5 max-w-copy text-service', {
  variants: {
    tone: {
      forest: 'text-primary-foreground [&_strong]:font-bold [&_strong]:text-cta',
      online: 'text-on-info-soft [&_strong]:font-bold [&_strong]:text-info-foreground',
    },
  },
});

type ServiceCardProps = {
  tone: 'forest' | 'online';
  hash: string;
  brand: ReactNode;
  amount: number;
  currency: Currency;
  extra?: ReactNode;
  children: ReactNode;
  action: string;
};

export function ServiceCard({
  tone,
  hash,
  brand,
  amount,
  currency,
  extra,
  children,
  action,
}: ServiceCardProps) {
  return (
    <Link to="/" hash={hash} className={cn(serviceCardVariants({ tone }))}>
      <span className="flex items-center justify-between gap-3.75">
        {brand}
        <SplitPrice
          amount={amount}
          currency={currency}
          className={priceVariants({ tone })}
          currencyClassName="text-caption font-semibold tracking-normal text-primary-foreground"
        />
      </span>
      {extra}
      <span className={cn('block', textVariants({ tone }))}>{children}</span>
      <span className="mt-1 flex items-center justify-end gap-2.5 text-caption font-bold">
        {action}
        <span
          className="grid size-7.5 shrink-0 place-items-center rounded-full border border-on-inverse/40 transition-colors duration-(--duration-fast) group-hover:border-on-inverse"
          aria-hidden="true"
        >
          <ArrowUpRightIcon className="size-3.5" />
        </span>
      </span>
    </Link>
  );
}
