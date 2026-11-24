import { useState, type ComponentProps, type ReactNode } from 'react';
import { MainContent } from '@/components/layout/main-content';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { useIsScrolledPast } from '@/hooks/use-is-scrolled-past';
import { ReportHeroContext } from './report-hero-context';

const HEADER_SOLID_AFTER_PX = 20;

type ReportLayoutProps = {
  header: Omit<ComponentProps<typeof SiteHeader>, 'isOnHero'>;
  children: ReactNode;
};

export function ReportLayout({ header, children }: ReportLayoutProps) {
  const [hasHero, setHasHero] = useState(false);
  const isScrolled = useIsScrolledPast(HEADER_SOLID_AFTER_PX);

  return (
    <div className="flex min-h-svh flex-col bg-card" data-density="comfortable">
      <SkipLink />
      <SiteHeader {...header} isOnHero={hasHero && !isScrolled} />
      <ReportHeroContext value={setHasHero}>
        <MainContent className="flex-1">{children}</MainContent>
      </ReportHeroContext>
      <SiteFooter />
    </div>
  );
}
