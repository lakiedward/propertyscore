import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useAuth } from '@/features/auth';
import { useSyncProfileLocale } from '@/features/profile';
import { ReportLayout } from '@/features/smart-check';
import { loadFeatureNamespaces } from '@/i18n/i18n';

export const Route = createFileRoute('/_report')({
  beforeLoad: () => loadFeatureNamespaces(['smartCheck']),
  component: ReportRouteLayout,
});

function ReportRouteLayout() {
  const { user } = useAuth();

  return (
    <ReportLayout>
      {user ? <ProfileLocaleSync userId={user.id} /> : null}
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
