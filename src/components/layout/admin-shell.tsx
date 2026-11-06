import type { ReactNode } from 'react';
import { PanelShell, type PanelNavCounts } from './panel-shell';

type AdminShellProps = {
  userMenu: ReactNode;
  navCounts?: PanelNavCounts;
  children: ReactNode;
};

export function AdminShell({ userMenu, navCounts, children }: AdminShellProps) {
  return (
    <PanelShell
      area="admin"
      userMenu={userMenu}
      navCounts={navCounts}
      mainClassName="px-4 pt-5 pb-10 md:p-6"
    >
      {children}
    </PanelShell>
  );
}
