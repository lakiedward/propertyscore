import { createFileRoute, Outlet } from '@tanstack/react-router';
import { FieldShell } from '@/components/layout/field-shell';
import { otherPanelGuard } from '@/features/auth';
import { UserMenu } from '@/features/profile';

export const Route = createFileRoute('/_authenticated/field')({
  beforeLoad: ({ context, location }) => {
    const guard = otherPanelGuard(context.auth, location);
    if (guard) {
      throw guard;
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
