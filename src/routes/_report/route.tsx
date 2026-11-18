import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/app-shell';
import { homePathFor, useAuth } from '@/features/auth';
import { LanguageSwitcher, UserMenu, useSyncProfileLocale } from '@/features/profile';

export const Route = createFileRoute('/_report')({
  component: ReportLayout,
});

function ReportLayout() {
  const { user, roles } = useAuth();
  const userId = user?.id;

  return (
    <AppShell
      actions={
        user ? (
          <UserMenu user={user} tone="light" panelPath={homePathFor(roles)} isNameHidden />
        ) : (
          <LanguageSwitcher userId={userId} />
        )
      }
    >
      {userId ? <ProfileLocaleSync userId={userId} /> : null}
      <Outlet />
    </AppShell>
  );
}

type ProfileLocaleSyncProps = {
  userId: string;
};

function ProfileLocaleSync({ userId }: ProfileLocaleSyncProps) {
  useSyncProfileLocale(userId);
  return null;
}
