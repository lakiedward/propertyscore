import { createFileRoute } from '@tanstack/react-router';
import { authQueries, authSearchSchema } from '@/features/auth';
import { AccountSettingsPage } from '@/features/profile';
import { panelPageHead } from '@/components/layout/panel-page-head';

export const Route = createFileRoute('/_authenticated/account/settings')({
  validateSearch: authSearchSchema,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query({
        ...authQueries.accountHasPassword(context.user.id),
        staleTime: 'static',
      }),
      context.queryClient.query({
        ...authQueries.accountPhone(context.user.id),
        staleTime: 'static',
      }),
    ]),
  head: panelPageHead('panel.account.nav.settings'),
  component: AccountSettingsRoute,
});

function AccountSettingsRoute() {
  const { user } = Route.useRouteContext();
  const { redirect } = Route.useSearch();

  return <AccountSettingsPage userId={user.id} email={user.email ?? ''} redirect={redirect} />;
}
