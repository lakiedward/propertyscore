import { createFileRoute, Outlet } from '@tanstack/react-router';
import { MainContent } from '@/components/layout/main-content';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { homePathFor, useAuth } from '@/features/auth';
import { LanguageSwitcher, UserMenu, useSyncProfileLocale } from '@/features/profile';

export const Route = createFileRoute('/_site')({
  component: SiteLayout,
});

function SiteLayout() {
  const { user, roles } = useAuth();
  const userId = user?.id;
  const panelPath = homePathFor(roles);

  return (
    <div className="flex min-h-svh flex-col bg-background" data-density="comfortable">
      {userId ? <ProfileLocaleSync userId={userId} /> : null}
      <SkipLink />
      <SiteHeader
        account={
          user
            ? {
                path: panelPath,
                menu: <UserMenu user={user} tone="light" panelPath={panelPath} isNameHidden />,
              }
            : undefined
        }
        menuLanguageSwitcher={<LanguageSwitcher userId={userId} variant="segmented" />}
      />
      <MainContent className="flex-1">
        <Outlet />
      </MainContent>
      <SiteFooter />
    </div>
  );
}

type ProfileLocaleSyncProps = {
  userId: string;
};

function ProfileLocaleSync({ userId }: ProfileLocaleSyncProps) {
  useSyncProfileLocale(userId);
  return null;
}
