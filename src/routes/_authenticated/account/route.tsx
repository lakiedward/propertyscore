import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AccountShell } from '@/components/layout/account-shell';
import { UserMenu } from '@/features/profile';
import { SETTINGS_PATHS } from '@/components/layout/panel-paths';

export const Route = createFileRoute('/_authenticated/account')({
  beforeLoad: ({ context, location }) => {
    if (context.auth.hasRole('admin')) {
      const isSettings = location.pathname.replace(/\/$/u, '') === SETTINGS_PATHS.account;
      throw redirect({
        to: isSettings ? SETTINGS_PATHS.admin : '/admin',
        search: isSettings ? location.search : {},
      });
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
