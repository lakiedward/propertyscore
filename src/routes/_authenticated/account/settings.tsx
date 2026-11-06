import { createFileRoute } from '@tanstack/react-router';
import { authQueries } from '@/features/auth';
import { AccountSettingsPage } from '@/features/profile';
import { panelPageHead } from '@/components/layout/panel-page-head';

export const Route = createFileRoute('/_authenticated/account/settings')({
  loader: ({ context }) =>
    context.queryClient.query({
      ...authQueries.accountHasPassword(context.user.id),
      staleTime: 'static',
    }),
  head: panelPageHead('panel.account.nav.settings'),
  component: AccountSettingsRoute,
});

function AccountSettingsRoute() {
  const { user } = Route.useRouteContext();

  return <AccountSettingsPage userId={user.id} email={user.email ?? ''} />;
}
