import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AccountShell } from '@/components/layout/account-shell';
import { otherPanelGuard } from '@/features/auth';
import { UserMenu } from '@/features/profile';

export const Route = createFileRoute('/_authenticated/account')({
  beforeLoad: ({ context, location }) => {
    const guard = otherPanelGuard(context.auth, location);
    if (guard) {
      throw guard;
    }
  },
  component: AccountLayout,
});

function AccountLayout() {
  const { user } = Route.useRouteContext();

  return (
    <AccountShell userMenu={<UserMenu user={user} tone="panel" />}>
      <Outlet />
    </AccountShell>
  );
}
