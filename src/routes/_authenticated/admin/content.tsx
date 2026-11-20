import { createFileRoute } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';

export const Route = createFileRoute('/_authenticated/admin/content')({
  head: panelPageHead('panel.admin.nav.content'),
});
