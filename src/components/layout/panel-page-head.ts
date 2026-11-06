import { i18n } from '@/i18n/i18n';
import { pageTitle } from '@/i18n/page-title';
import type { ACCOUNT_NAVIGATION, ADMIN_NAVIGATION } from './panel-navigation';

type NavItemId<TNavigation extends readonly { items: readonly { id: string }[] }[]> =
  TNavigation[number]['items'][number]['id'];

type AdminPageKey = `panel.admin.nav.${NavItemId<typeof ADMIN_NAVIGATION>}`;

export type PanelPageKey =
  `panel.account.nav.${NavItemId<typeof ACCOUNT_NAVIGATION>}` | AdminPageKey;

function isAdminPageKey(key: PanelPageKey): key is AdminPageKey {
  return key.startsWith('panel.admin.');
}

export function panelPageHead(titleKey: PanelPageKey) {
  return () => {
    const page = i18n.t(titleKey);
    const title = isAdminPageKey(titleKey) ? i18n.t('panel.admin.pageTitle', { page }) : page;
    return { meta: [{ title: pageTitle(title) }] };
  };
}
