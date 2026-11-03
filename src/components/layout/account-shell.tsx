import { useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ACCOUNT_NAVIGATION, findCurrentNavItem } from './panel-navigation';
import { PanelShell, type PanelMenuTone } from './panel-shell';

type AccountShellProps = {
  userMenu: (tone: PanelMenuTone) => ReactNode;
  children: ReactNode;
};

export function AccountShell({ userMenu, children }: AccountShellProps) {
  const { t } = useTranslation();
  const pathname = useLocation({ select: (location) => location.pathname });
  const groups = ACCOUNT_NAVIGATION.map((group) => ({
    id: group.id,
    title: t(`panel.account.groups.${group.id}`),
    items: group.items.map((item) => ({ ...item, label: t(`panel.account.nav.${item.id}`) })),
  }));
  const current = findCurrentNavItem(groups, pathname);
  const areaLabel = t('panel.account.label');

  return (
    <PanelShell
      groups={groups}
      navLabel={t('panel.account.navLabel')}
      areaLabel={areaLabel}
      expandLabel={t('panel.account.openMenu')}
      collapseLabel={t('panel.account.closeMenu')}
      headerStart={
        current ? (
          <p className="truncate text-body-sm font-bold text-muted-foreground">
            {t('panel.crumb', { area: areaLabel, page: current.label })}
          </p>
        ) : null
      }
      userMenu={userMenu}
      mainClassName="px-4 pt-5 pb-10 md:px-8 md:pt-7 md:pb-16"
    >
      {children}
    </PanelShell>
  );
}
