import { Link } from '@tanstack/react-router';
import { UserRoundIcon } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { useActiveSection } from '@/hooks/use-active-section';
import { useScrollProgress } from '@/hooks/use-scroll-progress';
import { useSectionNav } from '@/hooks/use-section-nav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PanelPath } from './panel-paths';
import { SITE_HERO_SURFACE, type SiteHeroTone } from './site-hero';
import { SiteMenu } from './site-menu';
import { HOME_SECTION } from './site-navigation';

export type SiteHeaderAccount = {
  path: PanelPath;
  menu: ReactNode;
  heroMenu?: ReactNode;
  menuSection?: ReactNode;
};

type SiteHeaderProps = {
  account?: SiteHeaderAccount | undefined;
  menuLanguageSwitcher: ReactNode;
  heroTone?: SiteHeroTone | null;
};

export function SiteHeader({ account, menuLanguageSwitcher, heroTone = null }: SiteHeaderProps) {
  const { t } = useTranslation();
  const isOnHero = heroTone !== null;
  const headerRef = useRef<HTMLElement>(null);
  const sectionNav = useSectionNav();
  const activeSection = useActiveSection(sectionNav?.links.map((link) => link.id) ?? []);
  useScrollProgress(headerRef);

  return (
    <header
      ref={headerRef}
      data-on-hero={isOnHero}
      className={cn(
        'sticky top-0 z-100 border-b transition-[background-color,border-color,box-shadow] duration-(--duration-base) ease-standard',
        isOnHero
          ? cn('border-transparent shadow-none', SITE_HERO_SURFACE[heroTone])
          : 'border-border bg-card shadow-header',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left scale-x-[var(--page-progress,0)] bg-primary',
          isOnHero && 'hidden',
        )}
      />
      <div className="flex min-h-header flex-wrap items-center gap-x-3 gap-y-3 px-5 py-2 w820:gap-x-6.5 w820:py-0">
        <SiteMenu
          accountPath={account?.path}
          accountSection={account?.menuSection}
          sectionNav={sectionNav}
          languageSwitcher={menuLanguageSwitcher}
          triggerTone={isOnHero ? 'inverse' : 'default'}
        />
        <Link
          to="/"
          hash={HOME_SECTION.main}
          aria-label={t('site.header.brandHome')}
          className="rounded-md focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Logo
            size="sm"
            tone={isOnHero ? 'inverse' : 'color'}
            isDecorative
            className="gap-1 w820:hidden"
          />
          <Logo
            size="md"
            tone={isOnHero ? 'inverse' : 'color'}
            isDecorative
            className="hidden gap-1 w820:inline-flex"
          />
        </Link>
        {sectionNav ? (
          <nav
            aria-label={t('site.sections.label')}
            className="order-3 hidden w-full w820:flex w820:justify-between w960:order-none w960:ml-auto w960:w-auto w960:justify-start w960:gap-3.25 w1080:gap-6.25"
          >
            {sectionNav.links.map((link) => (
              <Link
                key={link.id}
                to={sectionNav.page}
                hash={link.id}
                activeOptions={{ includeHash: true }}
                aria-current={activeSection === link.id ? 'location' : undefined}
                data-section-active={activeSection === link.id}
                className={cn(
                  'touch-target flex min-h-8 items-center justify-center text-meta font-nav whitespace-nowrap text-nav-link hover:underline hover:underline-offset-5 focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none w1080:text-caption',
                  'data-[section-active=true]:font-extrabold data-[section-active=true]:text-brand data-[section-active=true]:underline data-[section-active=true]:decoration-2 data-[section-active=true]:underline-offset-6',
                )}
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">
          {account ? (
            isOnHero && account.heroMenu !== undefined ? (
              account.heroMenu
            ) : (
              account.menu
            )
          ) : (
            <Link
              to="/login"
              aria-label={t('site.header.signIn')}
              className={cn(
                'touch-target inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-small font-action whitespace-nowrap transition-colors duration-(--duration-fast) focus-visible:ring-3 focus-visible:outline-none w1180:px-3',
                isOnHero
                  ? 'text-on-inverse hover:bg-on-inverse/10 focus-visible:ring-focus-inverse'
                  : 'text-brand hover:bg-surface-alt focus-visible:ring-ring',
              )}
            >
              <UserRoundIcon aria-hidden className="size-5.5 w1180:size-4" />
              <span className="sr-only w1180:not-sr-only">{t('site.header.signIn')}</span>
            </Link>
          )}
          <div className="hidden items-center gap-1.5 w820:flex">
            <Button
              asChild
              variant={isOnHero ? 'outlineInverse' : 'outline'}
              size="nav"
              className={cn(!isOnHero && 'border-border-control')}
            >
              <Link to="/publish">{t('site.header.publish')}</Link>
            </Button>
            <Button
              asChild
              variant={isOnHero ? 'inverseInfo' : 'info'}
              size="nav"
              className={cn(isOnHero ? 'border-card' : 'border-info')}
            >
              <Link to="/" hash={HOME_SECTION.smartCheck} aria-label={t('site.header.smartCheck')}>
                <BrandMark product="smartcheck" tone={isOnHero ? 'color' : 'inverse'} size={18} />
                <Logo
                  product="smartcheck"
                  tone={isOnHero ? 'color' : 'inverse'}
                  size="2xs"
                  hasMark={false}
                  isDecorative
                />
              </Link>
            </Button>
            <Button
              asChild
              variant={isOnHero ? 'cta' : 'default'}
              size="nav"
              className={cn(isOnHero ? 'border-cta' : 'border-primary hover:bg-primary-pressed')}
            >
              <Link to="/inspection" aria-label={t('site.header.physical')}>
                <BrandMark product="physical" size={18} />
                <Logo
                  product="physical"
                  tone={isOnHero ? 'color' : 'inverse'}
                  size="2xs"
                  hasMark={false}
                  isDecorative
                />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
