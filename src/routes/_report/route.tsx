import { createFileRoute, Outlet } from '@tanstack/react-router';
import { homePathFor, useAuth } from '@/features/auth';
import {
  LanguageSwitcher,
  SiteMenuAccount,
  UserMenu,
  useSyncProfileLocale,
} from '@/features/profile';
import { ReportLayout } from '@/features/smart-check';
import { loadFeatureNamespaces } from '@/i18n/i18n';

export const Route = createFileRoute('/_report')({
  beforeLoad: () => loadFeatureNamespaces(['smartCheck']),
  component: ReportRouteLayout,
});

function ReportRouteLayout() {
  const { user, roles } = useAuth();
  const userId = user?.id;
  const panelPath = homePathFor(roles);

  return (
    <ReportLayout
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
    </ReportLayout>
  );
}

type ProfileLocaleSyncProps = {
  userId: string;
};

function ProfileLocaleSync({ userId }: ProfileLocaleSyncProps) {
  useSyncProfileLocale(userId);
  return null;
}
