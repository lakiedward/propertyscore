import { createFileRoute } from '@tanstack/react-router';
import { authSearchSchema } from '@/features/auth';
import { AccountSettingsPage, loadAccountSettings } from '@/features/profile';
import { panelPageHead } from '@/components/layout/panel-page-head';
import { PendingPage } from '@/components/layout/pending-page';

export const Route = createFileRoute('/_authenticated/field/settings')({
  validateSearch: authSearchSchema,
  loader: ({ context }) => loadAccountSettings(context.queryClient, context.user.id),
  pendingComponent: PendingPage,
  head: panelPageHead('panel.field.nav.settings'),
  component: FieldSettingsRoute,
});

function FieldSettingsRoute() {
  const { user } = Route.useRouteContext();
  const { redirect } = Route.useSearch();

  return <AccountSettingsPage userId={user.id} email={user.email ?? ''} redirect={redirect} />;
}
