import { createFileRoute } from '@tanstack/react-router';
import { PanelPage } from '@/components/layout/panel-page';
import { panelPageHead } from '@/components/layout/panel-page-head';

export const Route = createFileRoute('/_authenticated/account/products')({
  head: panelPageHead('panel.account.nav.products'),
  component: () => <PanelPage titleKey="panel.account.nav.products" />,
});
