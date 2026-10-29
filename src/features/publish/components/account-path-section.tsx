import { Link } from '@tanstack/react-router';
import {
  ArrowRightIcon,
  ClipboardListIcon,
  GlobeIcon,
  LogInIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserRoundIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PUBLISH_SECTION } from '@/components/layout/site-navigation';
import { PUBLISH_REDIRECT } from '../publish.example';

type PathStepKey = 'prepare' | 'account' | 'publish';

const PATH_STEPS: readonly { key: PathStepKey; icon: LucideIcon }[] = [
  { key: 'prepare', icon: ClipboardListIcon },
  { key: 'account', icon: UserRoundIcon },
  { key: 'publish', icon: GlobeIcon },
];

type AccountPathSectionProps = {
  isSignedIn: boolean;
};

export function AccountPathSection({ isSignedIn }: AccountPathSectionProps) {
  const { t } = useTranslation('publish');

  return (
    <section
      id={PUBLISH_SECTION.account}
      aria-labelledby="account-path-title"
      className="bg-background"
    >
      <div className="page-wrap flex flex-col gap-7 py-11 w767:py-20">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-eyebrow leading-[1.55] text-muted-foreground uppercase">
              {t('path.eyebrow')}
            </p>
            <h2 id="account-path-title" className="text-h2 leading-[1.12] text-foreground">
              <span className="block">{t('path.titleLead')}</span>
              <span className="block text-heading-accent">{t('path.titleAccent')}</span>
            </h2>
          </div>
          <p className="max-w-105 text-body text-muted-foreground">{t('path.intro')}</p>
        </div>
        <ol className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border-hairline bg-card shadow-panel w767:grid-cols-3">
          {PATH_STEPS.map((step, index) => {
            const isAccount = step.key === 'account';
            const Icon = step.icon;
            return (
              <li
                key={step.key}
                className={cn(
                  'flex flex-col gap-3.5 p-7',
                  isAccount ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground',
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      'grid size-13 place-items-center rounded-[15px]',
                      isAccount ? 'bg-cta text-cta-foreground' : 'bg-secondary text-brand',
                    )}
                  >
                    <Icon aria-hidden className="size-6" />
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'text-[44px] leading-none font-extrabold tracking-[-0.04em] tabular-nums',
                      isAccount ? 'text-cta/35' : 'text-number-ghost',
                    )}
                  >
                    {index + 1}
                  </span>
                </span>
                <span
                  className={cn(
                    'self-start rounded-full px-2.5 py-1 text-meta leading-[1.55] font-extrabold tracking-[0.08em] uppercase',
                    isAccount ? 'bg-cta/16 text-cta' : 'bg-background text-muted-foreground',
                  )}
                >
                  {t(`path.steps.${step.key}.tag`)}
                </span>
                <strong className="text-[21px] leading-[1.25] font-bold tracking-[-0.02em]">
                  {t(`path.steps.${step.key}.title`)}
                </strong>
                <span
                  className={cn(
                    'text-[15px] leading-[1.55]',
                    isAccount ? 'text-on-inverse-soft' : 'text-muted-foreground',
                  )}
                >
                  {t(`path.steps.${step.key}.text`)}
                </span>
                {isAccount ? <AccountActions isSignedIn={isSignedIn} /> : null}
              </li>
            );
          })}
        </ol>
        <p className="flex items-start gap-2 text-small leading-[1.55] text-muted-foreground">
          <ShieldCheckIcon aria-hidden className="mt-0.5 size-4.5 shrink-0" />
          {t('path.note')}
        </p>
      </div>
    </section>
  );
}

const ACTION_CLASS =
  'inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-[15px] transition-colors duration-(--duration-fast) focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none [&_svg]:size-4.5';

function AccountActions({ isSignedIn }: { isSignedIn: boolean }) {
  const { t } = useTranslation('publish');

  if (isSignedIn) {
    return (
      <div className="flex flex-wrap gap-2 pt-2">
        <a
          href={`#${PUBLISH_SECTION.steps}`}
          className={cn(
            ACTION_CLASS,
            'bg-cta font-extrabold text-cta-foreground hover:bg-cta-hover',
          )}
        >
          <UserCheckIcon aria-hidden />
          {t('path.continue')}
          <ArrowRightIcon aria-hidden />
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <Link
        to="/login"
        search={{ redirect: PUBLISH_REDIRECT }}
        className={cn(ACTION_CLASS, 'bg-cta font-extrabold text-cta-foreground hover:bg-cta-hover')}
      >
        <LogInIcon aria-hidden />
        {t('path.signIn')}
      </Link>
      <Link
        to="/sign-up"
        search={{ redirect: PUBLISH_REDIRECT }}
        className={cn(
          ACTION_CLASS,
          'border-[1.5px] border-on-inverse/50 font-bold text-on-inverse hover:bg-on-inverse/10',
        )}
      >
        {t('path.signUp')}
      </Link>
    </div>
  );
}
