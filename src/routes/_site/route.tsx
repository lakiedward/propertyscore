import { createFileRoute, Outlet } from '@tanstack/react-router';
import { SiteLayout } from '@/components/layout/site-layout';
import { homePathFor, useAuth } from '@/features/auth';
import {
  LanguageSwitcher,
  SiteMenuAccount,
  UserMenu,
  useSyncProfileLocale,
} from '@/features/profile';

export const Route = createFileRoute('/_site')({
  component: SiteRouteLayout,
});

function SiteRouteLayout() {
  const { user, roles } = useAuth();
  const userId = user?.id;
  const panelPath = homePathFor(roles);

  return (
    <SiteLayout
      header={{
        account: user
          ? {
              path: panelPath,
              menu: <UserMenu user={user} tone="light" panelPath={panelPath} nameDisplay="first" />,
              heroMenu: (
                <UserMenu user={user} tone="inverse" panelPath={panelPath} nameDisplay="first" />
              ),
              menuSection: <SiteMenuAccount user={user} panelPath={panelPath} />,
            }
          : undefined,
        menuLanguageSwitcher: <LanguageSwitcher userId={userId} variant="segmented" />,
      }}
    >
      {userId ? <ProfileLocaleSync userId={userId} /> : null}
      <Outlet />
    </SiteLayout>
  );
}

type ProfileLocaleSyncProps = {
  userId: string;
};

function ProfileLocaleSync({ userId }: ProfileLocaleSyncProps) {
  useSyncProfileLocale(userId);
  return null;
}
