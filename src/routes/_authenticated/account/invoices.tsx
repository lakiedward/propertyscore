import { createFileRoute } from '@tanstack/react-router';
import { PanelPage } from '@/components/layout/panel-page';
import { panelPageHead } from '@/components/layout/panel-page-head';

export const Route = createFileRoute('/_authenticated/account/invoices')({
  head: panelPageHead('panel.account.nav.invoices'),
  component: () => <PanelPage titleKey="panel.account.nav.invoices" />,
});
