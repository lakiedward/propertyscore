import { useState, type ComponentProps, type ReactNode } from 'react';
import { useIsScrolledPast } from '@/hooks/use-is-scrolled-past';
import { MainContent } from './main-content';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import { SiteHeroContext, type SiteHeroTone } from './site-hero';
import { SkipLink } from './skip-link';

const HEADER_SOLID_AFTER_PX = 20;

type SiteLayoutProps = {
  header: Omit<ComponentProps<typeof SiteHeader>, 'heroTone'>;
  children: ReactNode;
};

export function SiteLayout({ header, children }: SiteLayoutProps) {
  const [heroTone, setHeroTone] = useState<SiteHeroTone | null>(null);
  const isScrolled = useIsScrolledPast(HEADER_SOLID_AFTER_PX);

  return (
    <div className="flex min-h-svh flex-col bg-background" data-density="comfortable">
      <SkipLink />
      <SiteHeader {...header} heroTone={isScrolled ? null : heroTone} />
      <SiteHeroContext value={setHeroTone}>
        <MainContent className="flex-1">{children}</MainContent>
      </SiteHeroContext>
      <SiteFooter />
    </div>
  );
}
