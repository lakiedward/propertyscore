import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelShell } from './panel-shell';

type AccountShellProps = {
  userMenu: ReactNode;
  children: ReactNode;
};

export function AccountShell({ userMenu, children }: AccountShellProps) {
  const { t } = useTranslation();

  return (
    <PanelShell
      area="account"
      headerStart={(current) =>
        current ? (
          <p className="truncate text-body-sm font-bold text-muted-foreground">
            {t('panel.crumb', { area: t('panel.account.label'), page: current.label })}
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
