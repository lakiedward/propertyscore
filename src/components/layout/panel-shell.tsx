import { Link, useLocation } from '@tanstack/react-router';
import { cva } from 'class-variance-authority';
import { ArrowLeftIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
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

export type PanelNavCounts = Partial<Record<string, { value: number; label: string }>>;

type PanelShellProps = {
  area: PanelArea;
  userMenu: ReactNode;
  mainClassName: string;
  navCounts?: PanelNavCounts;
  children: ReactNode;
};

const SIDEBAR_CLASS =
  'sticky top-0 z-101 hidden h-svh shrink-0 flex-col gap-3.5 overflow-hidden border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground shadow-sidebar md:flex';

const GROUP_TITLE_CLASS =
  'px-2.5 pb-1.5 text-meta leading-copy font-extrabold tracking-[0.1em] text-sidebar-group uppercase';

const sidebarLinkVariants = cva(
  'group relative flex min-h-12 items-center gap-3 rounded-icon px-2 text-body font-semibold text-sidebar-foreground not-data-[status=active]:hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:outline-none data-[status=active]:bg-sidebar-primary data-[status=active]:font-extrabold data-[status=active]:text-sidebar-primary-foreground',
  {
    variants: {
      isCollapsed: {
        true: 'justify-center',
        false: '',
      },
    },
  },
);

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
  userMenu,
  mainClassName,
  navCounts,
  children,
}: PanelShellProps) {
  const { t } = useTranslation();
  const { isCollapsed, toggle } = useSidebarCollapsed();
  const pathname = useLocation({ select: (location) => location.pathname });
  const groups = usePanelGroups(area);
  const items = groups.flatMap((group) => group.items);
  const navLabel = t(`panel.${area}.navLabel`);
  const brandHomeLabel = t('panel.brandHome', { brand: t('brand.core') });
  const areaLabel = t(`panel.${area}.label`);
  const currentItem = findCurrentNavItem(groups, pathname);

  return (
    <div data-density="compact" data-panel-area={area} className="flex min-h-svh bg-card">
      <SkipLink />
      <div className={cn(SIDEBAR_CLASS, isCollapsed ? 'w-19' : 'w-68')}>
        <div
          className={cn(
            'flex min-h-11 shrink-0 items-center gap-2.5 px-1',
            isCollapsed ? 'justify-center' : 'justify-between',
          )}
        >
          {isCollapsed ? null : (
            <Link
              to="/"
              aria-label={brandHomeLabel}
              className="inline-flex items-center gap-2.5 rounded-md focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            >
              <BrandMark tone="inverse" size={34} />
              <Logo tone="inverse" size="sm" hasMark={false} isDecorative />
            </Link>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label={isCollapsed ? t('panel.expandMenu') : t('panel.collapseMenu')}
            aria-expanded={!isCollapsed}
            className="touch-target grid size-10 shrink-0 place-items-center rounded-thumb bg-sidebar-control text-sidebar-icon hover:bg-sidebar-control-hover focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:outline-none"
          >
            {isCollapsed ? (
              <PanelLeftOpenIcon aria-hidden className="size-4.5" />
            ) : (
              <PanelLeftCloseIcon aria-hidden className="size-4.5" />
            )}
          </button>
        </div>
        <nav
          aria-label={navLabel}
          className="-mx-3 -my-1 scrollbar-none flex min-h-0 flex-1 flex-col gap-3.5 overflow-x-hidden overflow-y-auto px-3 py-1"
        >
          {groups.map((group) => (
            <div key={group.id} className="flex flex-col gap-1">
              {isCollapsed ? null : <p className={GROUP_TITLE_CLASS}>{group.title}</p>}
              {group.items.map((item) => (
                <SidebarLink
                  key={item.id}
                  item={item}
                  count={navCounts?.[item.id]}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t border-sidebar-divider pt-3.5">
          <Link
            to="/"
            title={isCollapsed ? t('panel.backToSite') : undefined}
            className={cn(
              'flex min-h-12 items-center gap-3 rounded-icon px-2.5 text-body-sm font-semibold text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:outline-none',
              isCollapsed && 'justify-center',
            )}
          >
            <ArrowLeftIcon aria-hidden className="size-5 shrink-0" />
            <span className={cn(isCollapsed && 'sr-only')}>{t('panel.backToSite')}</span>
          </Link>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-100 bg-surface-inverse text-on-inverse md:border-b md:border-border md:bg-card md:text-foreground md:shadow-panel-header">
          <div className="flex min-h-header items-center gap-3 pr-2 pl-4 md:min-h-18.75 md:px-8">
            <Link
              to="/"
              aria-label={brandHomeLabel}
              className="touch-target inline-flex rounded-md focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none md:hidden"
            >
              <BrandMark tone="inverse" size={20} />
            </Link>
            <span className="text-meta font-bold tracking-label text-cta uppercase md:hidden">
              {areaLabel}
            </span>
            {currentItem ? (
              <span className="hidden min-w-0 truncate text-title-xs leading-tight font-extrabold tracking-title text-foreground md:block">
                {currentItem.label}
              </span>
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
  count: { value: number; label: string } | undefined;
  isCollapsed: boolean;
};

function SidebarLink({ item, count, isCollapsed }: SidebarLinkProps) {
  const Icon = item.icon;
  const hasCount = count !== undefined && count.value > 0;

  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.isExact ?? false }}
      title={isCollapsed ? item.label : undefined}
      className={sidebarLinkVariants({ isCollapsed })}
    >
      <span
        aria-hidden
        className="absolute inset-y-2 -left-3 hidden w-1 rounded-r-sm bg-sidebar-band group-data-[status=active]:block"
      />
      <span className="grid size-9 shrink-0 place-items-center rounded-thumb bg-sidebar-icon-tile text-sidebar-icon group-data-[status=active]:bg-sidebar-icon-tile-active group-data-[status=active]:text-sidebar-icon-active">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className={cn('min-w-0 flex-1', isCollapsed && 'sr-only')}>{item.label}</span>
      {hasCount ? (
        <>
          <span
            aria-hidden
            className={cn(
              'grid h-5.5 min-w-6 place-items-center rounded-full bg-sidebar-count px-2 text-meta font-extrabold text-sidebar-count-foreground tabular-nums',
              isCollapsed && 'hidden',
            )}
          >
            {count.value}
          </span>
          <span className="sr-only">{count.label}</span>
        </>
      ) : null}
    </Link>
  );
}
