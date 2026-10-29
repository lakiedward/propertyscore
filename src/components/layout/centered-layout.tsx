import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Logo } from '@/components/brand/logo';

type CenteredLayoutProps = {
  actions: ReactNode;
  children: ReactNode;
};

export function CenteredLayout({ actions, children }: CenteredLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between gap-4 px-4 py-3">
        <Link
          to="/"
          className="rounded-md focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Logo size="sm" />
        </Link>
        {actions}
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
