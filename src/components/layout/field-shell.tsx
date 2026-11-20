import type { ReactNode } from 'react';
import { PanelShell } from './panel-shell';

type FieldShellProps = {
  userMenu: ReactNode;
  children: ReactNode;
};

export function FieldShell({ userMenu, children }: FieldShellProps) {
  return (
    <PanelShell
      area="field"
      userMenu={userMenu}
      mainClassName="px-4 pt-5 pb-10 md:px-8 md:pt-7 md:pb-16"
    >
      {children}
    </PanelShell>
  );
}
