import type { ReactNode } from 'react';
import { MainContent } from '@/components/layout/main-content';
import { SkipLink } from '@/components/layout/skip-link';

type ReportLayoutProps = {
  children: ReactNode;
};

export function ReportLayout({ children }: ReportLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background" data-density="comfortable">
      <SkipLink />
      <MainContent className="flex-1">{children}</MainContent>
    </div>
  );
}
