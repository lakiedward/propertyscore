import { createFileRoute } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';

export const Route = createFileRoute('/_authenticated/account/requests')({
  head: panelPageHead('panel.account.nav.requests'),
});
