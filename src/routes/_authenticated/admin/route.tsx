import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { AdminShell } from '@/components/layout/admin-shell';
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
  const { user } = Route.useRouteContext();

  return (
    <AdminShell userMenu={<UserMenu user={user} tone="panel" appRole="admin" />}>
      <Outlet />
    </AdminShell>
  );
}
