import { CheckIcon, ClockIcon, LockIcon, MapIcon, MapPinIcon, SparklesIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/logo';
import { formatPrice } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { CHECK_PRICE_RON } from '../check.utils';
import { CHECK_STEPS, type CheckStep } from '../smart-check.schemas';

const BADGE_ICONS = {
  address: MapIcon,
  confirm: MapPinIcon,
  details: ClockIcon,
  payment: LockIcon,
  done: SparklesIcon,
} as const satisfies Record<CheckStep, unknown>;

const ORDER_STEP_COUNT = 4;

type CheckHeroProps = {
  step: CheckStep;
  priceRon?: number | null;
};

export function CheckHero({ step, priceRon = CHECK_PRICE_RON }: CheckHeroProps) {
  const { t, i18n } = useTranslation('smartCheck');
  const current = CHECK_STEPS.indexOf(step);
  const BadgeIcon = BADGE_ICONS[step];
  const progress = { number: Math.min(current + 1, ORDER_STEP_COUNT), total: ORDER_STEP_COUNT };

  return (
    <section aria-labelledby="check-title" className="bg-info text-info-foreground">
      <div className="page-wrap flex max-w-default flex-col gap-5.5 pt-8 pb-7 w767:pt-12 w767:pb-9">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="pb-1.5">
              <Logo product="smartcheck" tone="inverse" size="card" />
            </div>
            <p className="text-caption font-extrabold tracking-label text-cta uppercase">
              {priceRon === null
                ? t('check.eyebrowWithoutPrice', progress)
                : t('check.eyebrow', {
                    ...progress,
                    price: formatPrice(priceRon, 'RON', i18n.resolvedLanguage),
                  })}
            </p>
            <h1
              id="check-title"
              className="text-[34px] leading-[1.1] font-extrabold tracking-[-0.03em] text-balance w767:text-[44px]"
            >
              {t(`check.heading.${step}.title`)}
            </h1>
          </div>
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-card/12 px-3 text-caption font-bold">
            <BadgeIcon aria-hidden className="size-3.5" />
            {t(`check.heading.${step}.badge`)}
          </span>
        </div>
        <ol aria-label={t('check.steps.label')} className="grid grid-cols-5 gap-1.5">
          {CHECK_STEPS.map((item, index) => {
            const isDone = index < current;
            const isCurrent = index === current;
            const label = t(`check.steps.${item}`);
            return (
              <li
                key={item}
                aria-current={isCurrent ? 'step' : undefined}
                className="flex min-w-0 flex-col gap-2"
              >
                <span
                  aria-hidden
                  className={cn('h-1 rounded-full', isDone || isCurrent ? 'bg-cta' : 'bg-card/25')}
                />
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-5.5 shrink-0 place-items-center rounded-full text-meta font-extrabold',
                      isCurrent && 'bg-cta text-cta-foreground',
                      isDone && 'bg-card text-info',
                      !isDone && !isCurrent && 'bg-card/20 text-info-foreground',
                    )}
                  >
                    {isDone ? <CheckIcon className="size-3.5" strokeWidth={3} /> : index + 1}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'truncate text-caption',
                      isCurrent ? 'font-extrabold' : 'font-semibold text-on-info-muted',
                      !isCurrent && 'max-w560:hidden',
                    )}
                  >
                    {label}
                  </span>
                  <span className="sr-only">
                    {isDone ? t('check.steps.completed', { label }) : label}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
