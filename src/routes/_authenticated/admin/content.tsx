import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PanelPage } from '@/components/layout/panel-page';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_authenticated/admin/content')({
  head: () => ({ meta: [{ title: pageTitle(i18n.t('panel.admin.nav.content')) }] }),
  component: AdminContentPage,
});

function AdminContentPage() {
  const { t } = useTranslation();

  return <PanelPage title={t('panel.admin.nav.content')} />;
}
