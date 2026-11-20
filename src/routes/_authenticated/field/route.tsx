import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { FieldShell } from '@/components/layout/field-shell';
import { UserMenu } from '@/features/profile';

export const Route = createFileRoute('/_authenticated/field')({
  beforeLoad: ({ context }) => {
    if (!context.auth.hasRole('inspector')) {
      throw notFound();
    }
  },
  component: FieldLayout,
});

function FieldLayout() {
  const { user } = Route.useRouteContext();

  return (
    <FieldShell userMenu={<UserMenu user={user} tone="panel" appRole="inspector" />}>
      <Outlet />
    </FieldShell>
  );
}
