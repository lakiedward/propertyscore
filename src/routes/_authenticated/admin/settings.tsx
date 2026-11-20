import { createFileRoute } from '@tanstack/react-router';
import { authSearchSchema } from '@/features/auth';
import { AccountSettingsPage, loadAccountSettings } from '@/features/profile';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';

export const Route = createFileRoute('/_authenticated/admin/settings')({
  validateSearch: authSearchSchema,
  loader: ({ context }) => loadAccountSettings(context.queryClient, context.user.id),
  pendingComponent: PendingPage,
  head: panelPageHead('panel.admin.nav.settings'),
  component: AdminSettingsRoute,
});

function AdminSettingsRoute() {
  const { user } = Route.useRouteContext();
  const { redirect } = Route.useSearch();

  return <AccountSettingsPage userId={user.id} email={user.email ?? ''} redirect={redirect} />;
}
