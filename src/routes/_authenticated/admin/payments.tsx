import { createFileRoute } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';

export const Route = createFileRoute('/_authenticated/admin/payments')({
  head: panelPageHead('panel.admin.nav.payments'),
});
