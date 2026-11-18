import type { ReactNode } from 'react';
import { PanelShell } from './panel-shell';

type AdminShellProps = {
  userMenu: ReactNode;
  children: ReactNode;
};

export function AdminShell({ userMenu, children }: AdminShellProps) {
  return (
    <PanelShell area="admin" userMenu={userMenu} mainClassName="px-4 pt-5 pb-10 md:p-6">
      {children}
    </PanelShell>
  );
}
