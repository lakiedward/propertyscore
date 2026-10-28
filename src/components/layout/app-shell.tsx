import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';

type AppShellProps = {
  actions: ReactNode;
  children: ReactNode;
};

export function AppShell({ actions, children }: AppShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-header w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link
            to="/"
            className="rounded-md focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-1">{actions}</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
