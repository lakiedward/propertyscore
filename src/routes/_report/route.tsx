import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/app-shell';
import { SignOutButton, useAuth } from '@/features/auth';
import { LanguageSwitcher, useSyncProfileLocale } from '@/features/profile';

export const Route = createFileRoute('/_report')({
  component: ReportLayout,
});

function ReportLayout() {
  const { user } = useAuth();
  const userId = user?.id;

  return (
    <AppShell
      actions={
        <>
          <LanguageSwitcher userId={userId} />
          {user ? <SignOutButton /> : null}
        </>
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
