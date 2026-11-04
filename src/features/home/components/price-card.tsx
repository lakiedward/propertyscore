import { cva } from 'class-variance-authority';
import { CheckIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { HomeSectionId } from '@/components/layout/site-navigation';
import { PillLink } from '@/components/navigation/pill-link';
import { TextLink } from '@/components/navigation/text-link';
import { SplitPrice } from '@/components/property/split-price';
import type { Currency } from '@/i18n/format';

type PriceCardTone = 'physical' | 'smartcheck';

const priceCardVariants = cva('flex flex-col gap-4.5 rounded-2xl p-6 text-on-inverse w520:p-10', {
  variants: { tone: { physical: 'bg-primary shadow-price', smartcheck: 'bg-info' } },
});

const CTA_TONE = { physical: 'cta', smartcheck: 'inverse' } as const satisfies Record<
  PriceCardTone,
  'cta' | 'inverse'
>;

type PriceCardProps = {
  tone: PriceCardTone;
  brand: ReactNode;
  amount: number;
  currency: Currency;
  summary: string;
  badge: ReactNode;
  features: readonly { title: string; text: string }[];
  cta: string;
  ctaHash: HomeSectionId;
  secondary: string;
  secondaryHash: HomeSectionId;
};

export function PriceCard({
  tone,
  brand,
  amount,
  currency,
  summary,
  badge,
  features,
  cta,
  ctaHash,
  secondary,
  secondaryHash,
}: PriceCardProps) {
  return (
    <article className={priceCardVariants({ tone })}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {brand}
        <SplitPrice
          amount={amount}
          currency={currency}
          className="text-title-lg leading-none font-extrabold tracking-[-0.045em] text-cta w520:text-[56px]"
          currencyClassName="text-lead-sm font-extrabold tracking-normal text-on-inverse"
        />
      </div>
      <p className="text-body text-on-inverse-bright w520:text-lead-sm">{summary}</p>
      {badge}
      <ul className="flex flex-col gap-3.5 border-t border-on-inverse/16 pt-4.5">
        {features.map((feature) => (
          <li key={feature.title} className="flex gap-3">
            <CheckIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-cta" />
            <span className="flex flex-col">
              <span className="text-body font-extrabold">{feature.title}</span>
              <span className="text-small text-on-inverse-muted">{feature.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-2">
        <PillLink to="/" hash={ctaHash} tone={CTA_TONE[tone]}>
          {cta}
        </PillLink>
        <TextLink to="/" hash={secondaryHash} tone="inverse">
          {secondary}
        </TextLink>
      </div>
    </article>
  );
}
