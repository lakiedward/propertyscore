import type { ReactNode } from 'react';
import { PanelShell } from './panel-shell';

type AccountShellProps = {
  userMenu: ReactNode;
  children: ReactNode;
};

export function AccountShell({ userMenu, children }: AccountShellProps) {
  return (
    <PanelShell
      area="account"
      userMenu={userMenu}
      mainClassName="px-4 pt-5 pb-10 md:px-8 md:pt-7 md:pb-16"
    >
      {children}
    </PanelShell>
  );
}
