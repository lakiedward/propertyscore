import { useQuery } from '@tanstack/react-query';
import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { AdminShell } from '@/components/layout/admin-shell';
import { moderationQueries } from '@/features/moderation';
import { UserMenu } from '@/features/profile';

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: ({ context }) => {
    if (!context.auth.hasRole('admin')) {
      throw notFound();
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { t } = useTranslation();
  const { user } = Route.useRouteContext();
  const { data: counts } = useQuery(moderationQueries.counts());
  const pending = counts?.pending_approval ?? 0;

  return (
    <AdminShell
      userMenu={<UserMenu user={user} tone="panel" appRole="admin" />}
      navCounts={{
        listings: { value: pending, label: t('panel.admin.pendingListings', { count: pending }) },
      }}
    >
      <Outlet />
    </AdminShell>
  );
}
