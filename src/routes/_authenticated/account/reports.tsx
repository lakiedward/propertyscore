import { createFileRoute } from '@tanstack/react-router';
import { PanelPage } from '@/components/layout/panel-page';
import { panelPageHead } from '@/components/layout/panel-page-head';

export const Route = createFileRoute('/_authenticated/account/reports')({
  head: panelPageHead('panel.account.nav.reports'),
  component: () => <PanelPage titleKey="panel.account.nav.reports" />,
});
