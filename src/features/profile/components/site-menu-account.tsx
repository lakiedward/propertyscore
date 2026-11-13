import type { User } from '@supabase/supabase-js';
import { Link } from '@tanstack/react-router';
import { LayoutDashboardIcon, LogOutIcon, SettingsIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PANEL_LINK_KEYS, type PanelPath } from '@/components/layout/panel-paths';
import {
  SITE_MENU_HEADING_CLASS,
  SITE_MENU_LINK_CLASS,
} from '@/components/layout/site-menu-styles';
import { SheetClose } from '@/components/ui/sheet';
import { settingsPathFor, SignOutDialog, useAuth } from '@/features/auth';
import { useAccountIdentity } from '../hooks/use-account-identity';

type SiteMenuAccountProps = {
  user: User;
  panelPath: PanelPath;
};

export function SiteMenuAccount({ user, panelPath }: SiteMenuAccountProps) {
  const { t } = useTranslation();
  const { roles } = useAuth();
  const { name, email } = useAccountIdentity(user);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  return (
    <section className="flex flex-col gap-1">
      <h2 className={SITE_MENU_HEADING_CLASS}>{t('site.footer.account.title')}</h2>
      <p className="flex min-w-0 flex-col px-1 pb-1">
        <span title={name} className="truncate text-body font-bold text-on-inverse">
          {name}
        </span>
        <span title={email} className="truncate text-small text-on-inverse-muted">
          {email}
        </span>
      </p>
      <SheetClose asChild>
        <Link to={panelPath} className={SITE_MENU_LINK_CLASS}>
          <LayoutDashboardIcon aria-hidden className="size-5" />
          {t(PANEL_LINK_KEYS[panelPath])}
        </Link>
      </SheetClose>
      <SheetClose asChild>
        <Link to={settingsPathFor(roles)} className={SITE_MENU_LINK_CLASS}>
          <SettingsIcon aria-hidden className="size-5" />
          {t('panel.account.nav.settings')}
        </Link>
      </SheetClose>
      <button
        type="button"
        onClick={() => {
          setIsSignOutOpen(true);
        }}
        className={SITE_MENU_LINK_CLASS}
      >
        <LogOutIcon aria-hidden className="size-5" />
        {t('actions.signOut')}
      </button>
      <SignOutDialog isOpen={isSignOutOpen} onOpenChange={setIsSignOutOpen} />
    </section>
  );
}
