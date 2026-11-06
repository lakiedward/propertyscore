import { Link, useLocation } from '@tanstack/react-router';
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { useSidebarCollapsed } from '@/hooks/use-sidebar-collapsed';
import { cn } from '@/lib/utils';
import { MainContent } from './main-content';
import {
  ACCOUNT_NAVIGATION,
  ADMIN_NAVIGATION,
  findCurrentNavItem,
  type ResolvedNavGroup,
  type ResolvedNavItem,
} from './panel-navigation';
import type { PanelArea } from './panel-paths';
import { SkipLink } from './skip-link';

type PanelShellProps = {
  area: PanelArea;
  headerStart?: (current: ResolvedNavItem | undefined) => ReactNode;
  userMenu: ReactNode;
  mainClassName: string;
  children: ReactNode;
};

function usePanelGroups(area: PanelArea): ResolvedNavGroup[] {
  const { t } = useTranslation();
  if (area === 'account') {
    return ACCOUNT_NAVIGATION.map((group) => ({
      id: group.id,
      title: t(`panel.account.groups.${group.id}`),
      items: group.items.map((item) => ({ ...item, label: t(`panel.account.nav.${item.id}`) })),
    }));
  }
  return ADMIN_NAVIGATION.map((group) => ({
    id: group.id,
    title: t(`panel.admin.groups.${group.id}`),
    items: group.items.map((item) => ({ ...item, label: t(`panel.admin.nav.${item.id}`) })),
  }));
}

export function PanelShell({
  area,
  headerStart,
  userMenu,
  mainClassName,
  children,
}: PanelShellProps) {
  const { t } = useTranslation();
  const { isCollapsed, toggle } = useSidebarCollapsed();
  const pathname = useLocation({ select: (location) => location.pathname });
  const groups = usePanelGroups(area);
  const items = groups.flatMap((group) => group.items);
  const navLabel = t(`panel.${area}.navLabel`);
  const brandHomeLabel = t('panel.brandHome', { brand: t('brand.core') });
  const headerStartContent = headerStart?.(findCurrentNavItem(groups, pathname));

  return (
    <div data-density="compact" className="flex min-h-svh bg-card">
      <SkipLink />
      <div
        className={cn(
          'sticky top-0 hidden h-svh shrink-0 flex-col gap-3.5 overflow-auto bg-sidebar px-3 py-4 text-on-inverse md:flex',
          isCollapsed ? 'w-19' : 'w-68',
        )}
      >
        <div
          className={cn(
            'flex min-h-11 items-center gap-2 px-1',
            isCollapsed ? 'justify-center' : 'justify-between',
          )}
        >
          {isCollapsed ? null : (
            <Link
              to="/"
              aria-label={brandHomeLabel}
              className="inline-flex items-center gap-2.5 rounded-md focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            >
              <span className="grid size-8.5 place-items-center rounded-thumb bg-cta">
                <BrandMark size={20} />
              </span>
              <Logo tone="inverse" size="sm" hasMark={false} isDecorative />
            </Link>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label={isCollapsed ? t('panel.expandMenu') : t('panel.collapseMenu')}
            aria-expanded={!isCollapsed}
            className="touch-target grid size-10 shrink-0 place-items-center rounded-thumb bg-sidebar-control text-on-inverse hover:bg-sidebar-control-hover focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:outline-none"
          >
            {isCollapsed ? (
              <PanelLeftOpenIcon aria-hidden className="size-4.5" />
            ) : (
              <PanelLeftCloseIcon aria-hidden className="size-4.5" />
            )}
          </button>
        </div>
        <nav aria-label={navLabel} className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.id} className="flex flex-col gap-0.5">
              {isCollapsed ? null : (
                <p className="px-2.5 pb-1.5 text-nav-sm font-extrabold tracking-[0.1em] text-sidebar-group uppercase">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => (
                <SidebarLink key={item.id} item={item} isCollapsed={isCollapsed} />
              ))}
            </div>
          ))}
        </nav>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-100 bg-surface-inverse text-on-inverse md:border-b md:border-border md:bg-card md:text-foreground">
          <div className="flex min-h-header items-center gap-3 pr-2 pl-4 md:min-h-[calc(var(--header-height)-1px)] md:px-6">
            <Link
              to="/"
              aria-label={brandHomeLabel}
              className="touch-target inline-flex rounded-md focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none md:hidden"
            >
              <BrandMark tone="inverse" size={20} />
            </Link>
            <span className="text-meta font-bold tracking-label text-cta uppercase md:hidden">
              {t(`panel.${area}.label`)}
            </span>
            {headerStartContent ? (
              <div className="hidden min-w-0 md:block">{headerStartContent}</div>
            ) : null}
            <div className="ml-auto flex items-center gap-1">{userMenu}</div>
          </div>
          <nav
            aria-label={navLabel}
            className="scrollbar-none overflow-x-auto border-t border-on-inverse/12 md:hidden"
          >
            <ul className="flex w-max gap-1 px-2 py-1.5">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    activeOptions={{ exact: item.isExact ?? false }}
                    className="inline-flex min-h-11 items-center rounded-md px-3 text-body-sm font-semibold whitespace-nowrap text-on-inverse focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none data-[status=active]:bg-cta data-[status=active]:font-extrabold data-[status=active]:text-cta-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        <MainContent className={cn('flex w-full min-w-0 flex-1 flex-col gap-5', mainClassName)}>
          {children}
        </MainContent>
      </div>
    </div>
  );
}

type SidebarLinkProps = {
  item: ResolvedNavItem;
  isCollapsed: boolean;
};

function SidebarLink({ item, isCollapsed }: SidebarLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.isExact ?? false }}
      title={isCollapsed ? item.label : undefined}
      className={cn(
        'group flex min-h-11.5 items-center gap-3 rounded-icon px-2 text-body-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:outline-none data-[status=active]:bg-sidebar-primary data-[status=active]:font-extrabold data-[status=active]:text-sidebar-primary-foreground',
        isCollapsed && 'justify-center',
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-[9px] text-sidebar-icon group-data-[status=active]:bg-cta group-data-[status=active]:text-cta-foreground">
        <Icon aria-hidden className="size-4.5" />
      </span>
      <span className={cn('min-w-0 flex-1', isCollapsed && 'sr-only')}>{item.label}</span>
    </Link>
  );
}
