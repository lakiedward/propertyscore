import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, RefreshCwIcon } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/logo';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { SERVICE_PRICES } from '@/config/pricing';
import { scoreBand } from '@/components/report/score-bands';
import { formatPrice } from '@/i18n/format';
import type { ReadyReport } from '../../../../report.types';

export function ClosingNextStep({ report }: { report: ReadyReport }) {
  const { t } = useTranslation('smartCheck');
  const { score } = report.result.zone;
  const isGood = score !== null && ['good', 'top'].includes(scoreBand(score));
  const physicalPrice = formatPrice(
    SERVICE_PRICES.physical.amount,
    SERVICE_PRICES.physical.currency,
  );
  const smartCheckPrice = formatPrice(
    SERVICE_PRICES.smartCheck.amount,
    SERVICE_PRICES.smartCheck.currency,
  );

  return (
    <section
      aria-labelledby="report-closing-next"
      className="rounded-[28px] border border-border bg-card p-4.5 shadow-report-card w560:p-7"
    >
      <p className="text-meta font-extrabold tracking-label text-muted-foreground uppercase">
        {t('report.chapters.closing.next.eyebrow')}
      </p>
      <h2
        id="report-closing-next"
        className="mt-1.5 text-[clamp(24px,3vw,32px)] leading-[1.1] font-extrabold tracking-[-0.025em] text-balance"
      >
        {t(
          isGood ? 'report.chapters.closing.next.titleGood' : 'report.chapters.closing.next.title',
        )}
      </h2>
      <div className="mt-4.5 grid gap-3.5">
        <article className="grid min-w-0 gap-3 rounded-icon bg-primary p-4.5 text-on-inverse shadow-report-card w560:px-6 w560:py-5.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <Logo product="physical" tone="inverse" size="md" />
            <span className="text-[25px] font-extrabold tracking-[-0.03em] text-cta w560:text-[30px]">
              {physicalPrice}
            </span>
          </div>
          <p className="text-[14.5px] leading-[1.55] text-on-inverse/90 [&_strong]:font-bold [&_strong]:text-cta">
            <Trans
              t={t}
              i18nKey={
                isGood
                  ? 'report.chapters.closing.next.textGood'
                  : 'report.chapters.closing.next.text'
              }
              components={{ strong: <strong /> }}
            />
          </p>
          <Link
            to="/"
            hash={HOME_SECTION.physical}
            className="group ml-auto flex items-center gap-3 text-[14px] font-extrabold text-on-inverse no-underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
          >
            {t('report.chapters.closing.next.book')} · {physicalPrice}
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full bg-cta text-cta-foreground transition-transform duration-(--duration-fast) group-hover:translate-x-0.75"
            >
              <ArrowRightIcon className="size-4.5" />
            </span>
          </Link>
        </article>
        <article className="grid min-w-0 content-between gap-3 rounded-icon bg-info p-4.5 text-info-foreground shadow-report-card w560:px-6 w560:py-5.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <Logo product="smartcheck" tone="inverse" size="md" />
            <span className="text-[25px] font-extrabold tracking-[-0.03em] w560:text-[30px]">
              {smartCheckPrice}
            </span>
          </div>
          <p className="text-[14.5px] leading-[1.55] [&_strong]:font-bold">
            <Trans
              t={t}
              i18nKey="report.chapters.closing.next.another"
              components={{ strong: <strong /> }}
            />
          </p>
          <Link
            to="/check"
            className="group ml-auto flex items-center gap-3 text-[14px] font-extrabold no-underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
          >
            {t('report.chapters.closing.next.anotherAction')}
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full border border-current/40 transition-colors group-hover:bg-white/12"
            >
              <RefreshCwIcon className="size-4" />
            </span>
          </Link>
        </article>
      </div>
    </section>
  );
}
