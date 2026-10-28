import { Link } from '@tanstack/react-router';
import { UserRoundIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { useActiveSection } from '@/hooks/use-active-section';
import { cn } from '@/lib/utils';
import { SiteMenu } from './site-menu';
import { HOME_SECTION, HOME_SECTION_IDS, HOME_SECTION_LINKS } from './site-navigation';

type SiteHeaderProps = {
  isSignedIn: boolean;
  languageSwitcher: ReactNode;
  menuLanguageSwitcher: ReactNode;
};

export function SiteHeader({
  isSignedIn,
  languageSwitcher,
  menuLanguageSwitcher,
}: SiteHeaderProps) {
  const { t } = useTranslation();
  const activeSection = useActiveSection(HOME_SECTION_IDS);

  return (
    <header className="sticky top-0 z-100 border-b border-border-subtle bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-header max-w-wide items-center gap-1.5 px-gutter sm:gap-2 lg:gap-4">
        <SiteMenu isSignedIn={isSignedIn} languageSwitcher={menuLanguageSwitcher} />
        <Link
          to="/"
          hash={HOME_SECTION.main}
          aria-label={t('site.header.brandHome')}
          className="rounded-md focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Logo size="sm" isDecorative className="2xl:text-logo-md" />
        </Link>
        <nav aria-label={t('site.sections.label')} className="ml-auto hidden xl:block">
          <ul className="flex items-center gap-3.5 2xl:gap-6">
            {HOME_SECTION_LINKS.map((link) => (
              <li key={link.id}>
                <Link
                  to="/"
                  hash={link.id}
                  aria-current={activeSection === link.id ? 'location' : undefined}
                  className={cn(
                    'relative flex min-h-touch items-center text-caption font-semibold whitespace-nowrap text-foreground transition-colors duration-(--duration-fast) hover:text-brand focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none 2xl:text-small',
                    'after:absolute after:inset-x-0 after:bottom-2 after:h-0.5 after:scale-x-0 after:bg-brand after:transition-transform after:duration-(--duration-fast)',
                    'aria-[current=location]:font-extrabold aria-[current=location]:text-brand aria-[current=location]:after:scale-x-100',
                  )}
                >
                  {t(link.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1.5 xl:ml-2">
          <div className="hidden lg:block">{languageSwitcher}</div>
          <Button asChild variant="ghost" size="icon" className="2xl:h-9 2xl:w-auto 2xl:px-3.5">
            <Link to={isSignedIn ? '/account' : '/login'}>
              <UserRoundIcon aria-hidden />
              <span className="sr-only 2xl:not-sr-only">
                {t(isSignedIn ? 'site.header.account' : 'site.header.signIn')}
              </span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex xl:hidden 2xl:inline-flex"
          >
            <Link to="/" hash={HOME_SECTION.listingIncluded}>
              {t('site.header.publish')}
            </Link>
          </Button>
          <Button asChild variant="info" size="sm" className="hidden sm:inline-flex">
            <Link to="/" hash={HOME_SECTION.smartCheck} aria-label={t('site.header.smartCheck')}>
              <BrandMark product="smartcheck" tone="inverse" size={20} />
              <Logo product="smartcheck" tone="inverse" size="xs" hasMark={false} isDecorative />
            </Link>
          </Button>
          <Button asChild size="icon" className="sm:hidden">
            <Link to="/" hash={HOME_SECTION.physical} aria-label={t('site.header.physical')}>
              <BrandMark product="physical" size={24} />
            </Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/" hash={HOME_SECTION.physical} aria-label={t('site.header.physical')}>
              <Logo product="physical" tone="inverse" size="xs" hasMark={false} isDecorative />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
