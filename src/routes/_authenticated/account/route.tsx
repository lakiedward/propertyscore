import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AccountShell } from '@/components/layout/account-shell';
import { UserMenu } from '@/features/profile';

export const Route = createFileRoute('/_authenticated/account')({
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
