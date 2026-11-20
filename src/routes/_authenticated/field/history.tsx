import { createFileRoute } from '@tanstack/react-router';
import { panelPageHead } from '@/components/layout/panel-page-head';

export const Route = createFileRoute('/_authenticated/field/history')({
  head: panelPageHead('panel.field.nav.history'),
});
