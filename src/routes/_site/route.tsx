import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { useAuth } from '@/features/auth';
import { LanguageSwitcher, useSyncProfileLocale } from '@/features/profile';

export const Route = createFileRoute('/_site')({
  component: SiteLayout,
});

function SiteLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id;

  return (
    <div className="flex min-h-svh flex-col bg-background" data-density="comfortable">
      {userId ? <ProfileLocaleSync userId={userId} /> : null}
      <a
        href="#main"
        className="sr-only z-200 rounded-md bg-primary px-4 py-3 text-label text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('site.skipToContent')}
      </a>
      <SiteHeader
        isSignedIn={Boolean(user)}
        languageSwitcher={<LanguageSwitcher userId={userId} />}
        menuLanguageSwitcher={<LanguageSwitcher userId={userId} variant="segmented" />}
      />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <SiteFooter isSignedIn={Boolean(user)} />
    </div>
  );
}

function ProfileLocaleSync({ userId }: { userId: string }) {
  useSyncProfileLocale(userId);
  return null;
}
