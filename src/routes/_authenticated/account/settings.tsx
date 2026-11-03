import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PanelPage } from '@/components/layout/panel-page';
import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';

export const Route = createFileRoute('/_authenticated/account/settings')({
  head: () => ({ meta: [{ title: pageTitle(i18n.t('panel.account.nav.settings')) }] }),
  component: AccountSettingsPage,
});

function AccountSettingsPage() {
  const { t } = useTranslation();

  return <PanelPage title={t('panel.account.nav.settings')} />;
}
