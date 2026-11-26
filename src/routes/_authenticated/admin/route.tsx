import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { AdminShell } from '@/components/layout/admin-shell';
import { otherPanelGuard } from '@/features/auth';
import { inspectionQueries } from '@/features/inspections';
import { moderationQueries } from '@/features/moderation';
import { UserMenu } from '@/features/profile';

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: ({ context, location }) => {
    const guard = otherPanelGuard(context.auth, location);
    if (guard) {
      throw guard;
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { t } = useTranslation();
  const { user } = Route.useRouteContext();
  const { data: counts } = useQuery(moderationQueries.counts());
  const pending = counts?.pending_approval ?? 0;
  const { data: unassigned } = useQuery(inspectionQueries.unassigned(null));
  const toAssign = unassigned?.length ?? 0;

  return (
    <AdminShell
      userMenu={<UserMenu user={user} tone="panel" appRole="admin" />}
      navCounts={{
        listings: { value: pending, label: t('panel.admin.pendingListings', { count: pending }) },
        appointments: {
          value: toAssign,
          label: t('panel.admin.unassignedInspections', { count: toAssign }),
        },
      }}
    >
      <Outlet />
    </AdminShell>
  );
}
