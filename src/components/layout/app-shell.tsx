import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type AppShellProps = {
  actions: ReactNode;
  children: ReactNode;
};

export function AppShell({ actions, children }: AppShellProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="font-semibold">
            {t('app.name')}
          </Link>
          <div className="flex items-center gap-1">{actions}</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
