import type { User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { cva } from 'class-variance-authority';
import { ChevronDownIcon, LanguagesIcon, LogOutIcon, SettingsIcon, UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSignOut, type AppRole } from '@/features/auth';
import { SUPPORTED_LOCALES } from '@/i18n/i18n';
import { useLocale } from '@/i18n/use-locale';
import { profileQueries } from '../api/profile.queries';
import { useChangeLocale } from '../hooks/use-change-locale';
import { initialsOf } from '../profile.utils';

const triggerVariants = cva(
  'inline-flex min-h-11 items-center gap-2 rounded-full pr-2 pl-1 text-body-sm font-bold focus-visible:ring-3 focus-visible:outline-none',
  {
    variants: {
      tone: {
        light: 'text-foreground hover:bg-secondary focus-visible:ring-ring',
        inverse: 'text-on-inverse hover:bg-sidebar-accent focus-visible:ring-focus-inverse',
      },
    },
  },
);

const avatarVariants = cva(
  'grid size-8.5 shrink-0 place-items-center rounded-full text-[13px] font-extrabold',
  {
    variants: {
      tone: {
        light: 'bg-primary text-primary-foreground',
        inverse: 'bg-cta text-cta-foreground',
      },
    },
  },
);

const ITEM_CLASS = 'min-h-11 gap-2.5 px-3 text-body-sm [&_svg]:size-4.5';

type UserMenuProps = {
  user: User;
  tone: 'light' | 'inverse';
  appRole?: AppRole;
};

export function UserMenu({ user, tone, appRole }: UserMenuProps) {
  const { t } = useTranslation();
  const { data: profile } = useQuery(profileQueries.detail(user.id));
  const signOut = useSignOut();
  const locale = useLocale();
  const changeLanguage = useChangeLocale(user.id);
  const otherLocale = SUPPORTED_LOCALES.find((option) => option !== locale) ?? locale;
  const email = user.email ?? '';
  const name = profile?.full_name ?? email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={triggerVariants({ tone })}>
          <span aria-hidden="true" className={avatarVariants({ tone })}>
            {initialsOf(name)}
          </span>
          <span className="flex flex-col items-start leading-tight max-md:sr-only">
            <span>{name}</span>
            {appRole ? (
              <span className="text-nav-sm font-extrabold tracking-[0.08em] text-brand uppercase">
                {t(`panel.userMenu.role.${appRole}`)}
              </span>
            ) : null}
          </span>
          <ChevronDownIcon aria-hidden className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-65 p-1.5">
        <DropdownMenuLabel className="mb-1 flex flex-col border-b border-border-subtle px-3 py-2.5">
          <strong className="text-body-sm font-bold text-foreground">{name}</strong>
          <span className="text-meta text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuItem asChild className={ITEM_CLASS}>
          <Link to="/account/settings">
            <UserIcon aria-hidden />
            {t('panel.userMenu.profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={ITEM_CLASS}>
          <Link to="/account/settings">
            <SettingsIcon aria-hidden />
            {t('panel.userMenu.settings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          lang={otherLocale}
          className={ITEM_CLASS}
          onSelect={() => {
            changeLanguage(otherLocale);
          }}
        >
          <LanguagesIcon aria-hidden />
          {t(`language.${otherLocale}`)}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          className={ITEM_CLASS}
          onSelect={() => {
            signOut.mutate();
          }}
        >
          <LogOutIcon aria-hidden />
          {t('panel.userMenu.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
