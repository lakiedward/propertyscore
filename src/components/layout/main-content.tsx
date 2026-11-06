import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MAIN_CONTENT_ID } from './main-content-id';

type MainContentProps = {
  className?: string;
  children: ReactNode;
};

export function MainContent({ className, children }: MainContentProps) {
  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className={cn(
        'focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset',
        className,
      )}
    >
      {children}
    </main>
  );
}
