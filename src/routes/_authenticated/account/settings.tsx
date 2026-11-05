import { createFileRoute } from '@tanstack/react-router';
import { PendingPage } from '@/components/layout/pending-page';
import { authQueries } from '@/features/auth';
import { AccountSettingsPage } from '@/features/profile';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_authenticated/account/settings')({
  loader: ({ context }) =>
    context.queryClient.query(authQueries.accountHasPassword(context.user.id)),
  head: () => ({ meta: [{ title: pageTitle(i18n.t('panel.account.nav.settings')) }] }),
  pendingComponent: PendingPage,
  component: AccountSettingsRoute,
});

function AccountSettingsRoute() {
  const { user } = Route.useRouteContext();

  return <AccountSettingsPage userId={user.id} email={user.email ?? ''} />;
}
