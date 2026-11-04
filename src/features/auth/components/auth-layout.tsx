import type { ReactNode } from 'react';
import { AuthPhotoPanel } from './auth-photo-panel';

type AuthLayoutProps = {
  languageSwitcher: ReactNode;
  children: ReactNode;
};

export function AuthLayout({ languageSwitcher, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh flex-wrap bg-card w920:h-svh w920:overflow-hidden">
      <AuthPhotoPanel />
      <div className="flex grow basis-110 flex-col px-[clamp(24px,4vw,48px)] py-4 w920:h-svh w920:overflow-y-auto short:py-1">
        <div className="flex justify-end">{languageSwitcher}</div>
        <main id="main" className="flex flex-1 items-center justify-center pt-3">
          <div className="flex w-full max-w-105 flex-col gap-3.5 short:gap-2.5">{children}</div>
        </main>
      </div>
    </div>
  );
}
