import type { User } from '@supabase/supabase-js';
import { Link } from '@tanstack/react-router';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  ChevronDownIcon,
  LanguagesIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  SettingsIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PANEL_LINK_KEYS, type PanelPath } from '@/components/layout/panel-paths';
import { settingsPathFor, SignOutDialog, useAuth, type AppRole } from '@/features/auth';
import { SUPPORTED_LOCALES } from '@/i18n/i18n';
import { useLocale } from '@/i18n/use-locale';
import { cn } from '@/lib/utils';
import { useAccountIdentity } from '../hooks/use-account-identity';
import { useChangeLocale } from '../hooks/use-change-locale';
import { initialsOf } from '../profile.utils';

const triggerVariants = cva(
  'inline-flex min-h-11 items-center gap-2 rounded-full pr-2 pl-1 text-body-sm font-bold focus-visible:ring-3 focus-visible:outline-none',
  {
    variants: {
      tone: {
        light: 'text-foreground hover:bg-secondary focus-visible:ring-ring',
        inverse: 'text-on-inverse hover:bg-on-inverse/8 focus-visible:ring-focus-inverse',
        panel:
          'text-on-inverse hover:bg-on-inverse/8 focus-visible:ring-focus-inverse md:text-foreground md:hover:bg-secondary md:focus-visible:ring-ring',
      },
    },
  },
);

const avatarVariants = cva(
  'grid size-8.5 shrink-0 place-items-center rounded-full text-caption leading-none font-extrabold',
  {
    variants: {
      tone: {
        light: 'bg-primary text-primary-foreground',
        inverse: 'bg-cta text-cta-foreground',
        panel: 'bg-cta text-cta-foreground md:bg-primary md:text-primary-foreground',
      },
    },
  },
);

type UserMenuProps = {
  user: User;
  tone: NonNullable<VariantProps<typeof triggerVariants>['tone']>;
  appRole?: AppRole;
  panelPath?: PanelPath;
  isNameHidden?: boolean;
};

export function UserMenu({ user, tone, appRole, panelPath, isNameHidden = false }: UserMenuProps) {
  const { t } = useTranslation();
  const { roles } = useAuth();
  const { name, email } = useAccountIdentity(user);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const locale = useLocale();
  const changeLanguage = useChangeLocale(user.id);
  const otherLocale = SUPPORTED_LOCALES.find((option) => option !== locale) ?? locale;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={triggerVariants({ tone })}>
            <span aria-hidden="true" className={avatarVariants({ tone })}>
              {initialsOf(name)}
            </span>
            <span
              className={cn(
                'flex flex-col items-start leading-tight',
                isNameHidden ? 'sr-only' : 'max-md:sr-only',
              )}
            >
              <span>{name}</span>
              {appRole ? (
                <span className="text-nav-sm font-extrabold tracking-label text-brand uppercase">
                  {t(`panel.userMenu.role.${appRole}`)}
                </span>
              ) : null}
            </span>
            <ChevronDownIcon aria-hidden className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-65">
          <DropdownMenuLabel className="mb-1 flex min-w-0 flex-col border-b border-border-subtle px-3 py-2.5">
            <strong title={name} className="truncate text-body-sm font-bold text-foreground">
              {name}
            </strong>
            <span title={email} className="truncate text-meta text-muted-foreground">
              {email}
            </span>
          </DropdownMenuLabel>
          {panelPath ? (
            <DropdownMenuItem asChild>
              <Link to={panelPath}>
                <LayoutDashboardIcon aria-hidden />
                {t(PANEL_LINK_KEYS[panelPath])}
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild>
            <Link to={settingsPathFor(roles)}>
              <SettingsIcon aria-hidden />
              {t('panel.account.nav.settings')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            lang={otherLocale}

            onSelect={() => {
              changeLanguage(otherLocale);
            }}
          >
            <LanguagesIcon aria-hidden />
            {t(`language.${otherLocale}`)}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"

            onSelect={() => {
              setIsSignOutOpen(true);
            }}
          >
            <LogOutIcon aria-hidden />
            {t('actions.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SignOutDialog isOpen={isSignOutOpen} onOpenChange={setIsSignOutOpen} />
    </>
  );
}
