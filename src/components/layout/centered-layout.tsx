import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type CenteredLayoutProps = {
  actions: ReactNode;
  children: ReactNode;
};

export function CenteredLayout({ actions, children }: CenteredLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <header className="flex items-center justify-between gap-4 px-4 py-3">
        <span className="font-semibold">{t('app.name')}</span>
        {actions}
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
