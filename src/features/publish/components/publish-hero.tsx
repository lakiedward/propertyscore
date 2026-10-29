import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, CirclePlayIcon, KeyRoundIcon, LockIcon, LogInIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/i18n/format';
import { PUBLISH_SECTION } from '@/components/layout/site-navigation';
import { PUBLISH_REDIRECT, PUBLISHING_COST } from '../publish.example';
import { ExampleListingCard } from './example-listing-card';

type PublishHeroProps = {
  isSignedIn: boolean;
};

export function PublishHero({ isSignedIn }: PublishHeroProps) {
  const { t } = useTranslation('publish');
  const stats = [
    {
      key: 'cost',
      value: formatPrice(PUBLISHING_COST.amount, PUBLISHING_COST.currency),
      label: t('hero.stats.cost.label'),
    },
    { key: 'time', value: t('hero.stats.time.value'), label: t('hero.stats.time.label') },
    { key: 'review', value: t('hero.stats.review.value'), label: t('hero.stats.review.label') },
  ];

  return (
    <section
      aria-labelledby="publish-title"
      className="bg-card pt-5 pb-12 w520:pt-7 w520:pb-14 w820:pt-8 w820:pb-18"
    >
      <div className="page-wrap grid grid-cols-1 gap-9 w767:gap-14 w1059:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col items-start justify-center gap-5.5">
          <span className="inline-flex h-8 items-center gap-2 rounded-full bg-step-coral-surface px-3.5 text-caption font-extrabold text-step-coral-ink">
            <KeyRoundIcon aria-hidden className="size-4" />
            {t('hero.eyebrow')}
          </span>
          <h1
            id="publish-title"
            className="text-[38px] leading-[1.14] font-extrabold tracking-[-0.04em] text-foreground w767:text-[60px]"
          >
            {t('hero.titleLead')}{' '}
            <span className="rounded-[10px] bg-cta box-decoration-clone px-[0.14em] leading-[1.02]">
              {t('hero.titleAccent')}
            </span>
          </h1>
          <p className="max-w-130 text-lead-sm font-medium text-foreground w767:text-xl w767:leading-[1.6]">
            {t('hero.lead')}
          </p>
          <div className="flex w-full flex-col gap-3 w560:w-auto w560:flex-row w560:flex-wrap w560:items-center">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="gap-2.5 border-[1.5px] text-lead-sm leading-[1.2] font-bold"
            >
              <a href={`#${PUBLISH_SECTION.steps}`}>
                <CirclePlayIcon aria-hidden />
                {t('hero.seeSteps')}
              </a>
            </Button>
            <Button
              asChild
              variant="cta"
              size="lg"
              className="h-auto min-h-13 gap-2.5 border-[1.5px] py-2 text-lead-sm leading-tight font-bold whitespace-normal"
            >
              {isSignedIn ? (
                <a href={`#${PUBLISH_SECTION.steps}`}>
                  {t('hero.startSignedIn')}
                  <ArrowRightIcon aria-hidden />
                </a>
              ) : (
                <Link to="/login" search={{ redirect: PUBLISH_REDIRECT }}>
                  <LogInIcon aria-hidden />
                  {t('hero.startSignedOut')}
                  <ArrowRightIcon aria-hidden />
                </Link>
              )}
            </Button>
          </div>
          {isSignedIn ? null : (
            <p className="-mt-2 flex items-start gap-2 text-small leading-[1.55] text-muted-foreground">
              <LockIcon aria-hidden className="mt-0.75 size-4 shrink-0" />
              {t('hero.accountHint')}
            </p>
          )}
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            {stats.map((stat) => (
              <div key={stat.key} className="flex flex-col-reverse gap-0.5">
                <dt className="text-caption leading-[1.55] text-muted-foreground">{stat.label}</dt>
                <dd className="text-[26px] leading-[1.55] font-extrabold tracking-[-0.03em] text-foreground tabular-nums">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <ExampleListingCard />
      </div>
    </section>
  );
}
