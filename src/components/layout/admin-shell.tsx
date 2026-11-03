import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ADMIN_NAVIGATION } from './panel-navigation';
import { PanelShell, type PanelMenuTone } from './panel-shell';

type AdminShellProps = {
  userMenu: (tone: PanelMenuTone) => ReactNode;
  children: ReactNode;
};

export function AdminShell({ userMenu, children }: AdminShellProps) {
  const { t } = useTranslation();
  const groups = ADMIN_NAVIGATION.map((group) => ({
    id: group.id,
    title: t(`panel.admin.groups.${group.id}`),
    items: group.items.map((item) => ({ ...item, label: t(`panel.admin.nav.${item.id}`) })),
  }));

  return (
    <PanelShell
      groups={groups}
      navLabel={t('panel.admin.navLabel')}
      areaLabel={t('panel.admin.label')}
      expandLabel={t('panel.admin.openMenu')}
      collapseLabel={t('panel.admin.closeMenu')}
      userMenu={userMenu}
      headerRowClassName="md:min-h-[calc(var(--header-height)-1px)]"
      mainClassName="px-4 pt-5 pb-10 md:p-6"
    >
      {children}
    </PanelShell>
  );
}
