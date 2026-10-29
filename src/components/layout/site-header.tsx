import { Link } from '@tanstack/react-router';
import { UserRoundIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { useActiveSection } from '@/hooks/use-active-section';
import { cn } from '@/lib/utils';
import { SiteMenu } from './site-menu';
import { HOME_SECTION, HOME_SECTION_IDS, HOME_SECTION_LINKS } from './site-navigation';

type SiteHeaderProps = {
  isSignedIn: boolean;
  menuLanguageSwitcher: ReactNode;
};

const actionClassName =
  'inline-flex min-h-9 items-center justify-center gap-1.25 rounded-md border px-3 py-1.75 text-logo-2xs leading-tight font-bold whitespace-nowrap transition-colors duration-(--duration-fast) focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none';

export function SiteHeader({ isSignedIn, menuLanguageSwitcher }: SiteHeaderProps) {
  const { t } = useTranslation();
  const activeSection = useActiveSection(HOME_SECTION_IDS);
  const accountLabel = t(isSignedIn ? 'site.header.account' : 'site.header.signIn');

  return (
    <header className="sticky top-0 z-100 border-b border-border bg-card shadow-header">
      <div className="flex min-h-header flex-wrap items-center gap-x-6.5 gap-y-3 px-5 py-2 w820:py-0">
        <SiteMenu isSignedIn={isSignedIn} languageSwitcher={menuLanguageSwitcher} />
        <Link
          to="/"
          hash={HOME_SECTION.main}
          aria-label={t('site.header.brandHome')}
          className="rounded-md focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Logo size="md" isDecorative className="gap-1" />
        </Link>
        <nav
          aria-label={t('site.sections.label')}
          className="order-3 grid w-full grid-cols-[1fr_1.1fr_1.4fr_0.8fr] gap-1 w820:flex w820:justify-between w960:order-none w960:ml-auto w960:w-auto w960:justify-start w960:gap-3.25 w1080:gap-6.25"
        >
          {HOME_SECTION_LINKS.map((link) => (
            <Link
              key={link.id}
              to="/"
              hash={link.id}
              aria-current={activeSection === link.id ? 'location' : undefined}
              className={cn(
                'flex min-h-11 items-center justify-center text-nav-sm font-nav whitespace-nowrap text-nav-link hover:underline hover:underline-offset-5 focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none w520:text-meta w820:min-h-8 w1080:text-caption',
                'aria-[current=location]:font-extrabold aria-[current=location]:text-brand aria-[current=location]:underline aria-[current=location]:decoration-2 aria-[current=location]:underline-offset-6',
              )}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to={isSignedIn ? '/account' : '/login'}
            aria-label={accountLabel}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-small font-action whitespace-nowrap text-brand transition-colors duration-(--duration-fast) hover:bg-surface-alt focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none w1180:px-3"
          >
            <UserRoundIcon aria-hidden className="size-5.5 w1180:size-4" />
            <span className="sr-only w1180:not-sr-only">{accountLabel}</span>
          </Link>
          <Link
            to="/publish"
            className={cn(
              actionClassName,
              'hidden border-border-control text-brand hover:bg-surface-alt w560:inline-flex',
            )}
          >
            {t('site.header.publish')}
          </Link>
          <Link
            to="/"
            hash={HOME_SECTION.smartCheck}
            aria-label={t('site.header.smartCheck')}
            className={cn(
              actionClassName,
              'hidden border-info bg-info text-info-foreground hover:bg-info-hover w560:inline-flex',
            )}
          >
            <BrandMark product="smartcheck" tone="inverse" size={18} />
            <Logo product="smartcheck" tone="inverse" size="2xs" hasMark={false} isDecorative />
          </Link>
          <Link
            to="/"
            hash={HOME_SECTION.physical}
            aria-label={t('site.header.physical')}
            className={cn(
              actionClassName,
              'border-primary bg-primary text-primary-foreground hover:bg-primary-pressed',
            )}
          >
            <BrandMark product="physical" size={18} />
            <Logo product="physical" tone="inverse" size="2xs" hasMark={false} isDecorative />
          </Link>
        </div>
      </div>
    </header>
  );
}
