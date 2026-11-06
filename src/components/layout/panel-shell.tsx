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
  headerStart?: (current: ResolvedNavItem | undefined) => ReactNode;
  userMenu: ReactNode;
  mainClassName: string;
  navCounts?: PanelNavCounts;
  children: ReactNode;
};

const sidebarVariants = cva(
  'sticky top-0 hidden h-svh shrink-0 flex-col overflow-auto bg-sidebar text-on-inverse md:flex',
  {
    variants: {
      area: {
        account: 'gap-3.5 px-3 py-4',
        admin: 'gap-5.5 px-3.5 pt-5 pb-4',
      },
    },
  },
);

const groupTitleVariants = cva(
  'px-2.5 pb-1.5 text-nav-sm font-extrabold text-sidebar-group uppercase',
  {
    variants: {
      area: {
        account: 'tracking-[0.1em]',
        admin: 'pb-2 leading-copy tracking-[0.12em]',
      },
    },
  },
);

const sidebarLinkVariants = cva(
  'group flex items-center text-sidebar-foreground hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:outline-none data-[status=active]:bg-sidebar-primary data-[status=active]:font-extrabold data-[status=active]:text-sidebar-primary-foreground',
  {
    variants: {
      area: {
        account: 'min-h-11.5 gap-3 rounded-icon px-2 text-body-sm font-semibold',
        admin: 'min-h-11 gap-3 rounded-thumb px-2.5 text-nav font-semibold',
      },
      isCollapsed: {
        true: 'justify-center',
        false: '',
      },
    },
  },
);

const sidebarIconVariants = cva('grid shrink-0 place-items-center text-sidebar-icon', {
  variants: {
    area: {
      account:
        'size-8 rounded-[9px] group-data-[status=active]:bg-cta group-data-[status=active]:text-cta-foreground',
      admin: 'size-5.5 group-data-[status=active]:text-sidebar-primary-foreground',
    },
  },
});

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
  const headerStartContent = headerStart?.(findCurrentNavItem(groups, pathname));

  return (
    <div data-density="compact" data-panel-area={area} className="flex min-h-svh bg-card">
      <SkipLink />
      <div className={cn(sidebarVariants({ area }), isCollapsed ? 'w-19' : 'w-68')}>
        <div
          className={cn(
            'flex min-h-11 gap-2 px-1',
            area === 'admin' ? 'items-start pb-4.5' : 'items-center',
            isCollapsed ? 'justify-center' : 'justify-between',
          )}
        >
          {isCollapsed ? null : (
            <Link
              to="/"
              aria-label={brandHomeLabel}
              className={cn(
                'inline-grid grid-cols-[auto_auto] items-center gap-y-1.5 rounded-md focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:outline-none',
                area === 'admin' ? 'gap-x-1' : 'gap-x-2.5',
              )}
            >
              <span
                className={cn(
                  'grid place-items-center rounded-thumb bg-cta',
                  area === 'admin' ? 'size-8' : 'size-8.5',
                )}
              >
                <BrandMark size={20} />
              </span>
              <Logo tone="inverse" size="sm" hasMark={false} isDecorative />
              {area === 'admin' ? (
                <span className="col-start-2 justify-self-start rounded-full bg-sidebar-chip px-2 py-0.75 text-nav-sm leading-copy font-extrabold tracking-label text-cta uppercase">
                  {t('panel.admin.label')}
                </span>
              ) : null}
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
        <nav
          aria-label={navLabel}
          className={cn('flex flex-col', area === 'admin' ? 'gap-5.5' : 'gap-4')}
        >
          {groups.map((group) => (
            <div key={group.id} className="flex flex-col gap-0.5">
              {isCollapsed ? null : <p className={groupTitleVariants({ area })}>{group.title}</p>}
              {group.items.map((item) => (
                <SidebarLink
                  key={item.id}
                  area={area}
                  item={item}
                  count={navCounts?.[item.id]}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
          ))}
        </nav>
        {area === 'admin' ? (
          <div className="mt-auto border-t border-sidebar-divider pt-3.5">
            <Link
              to="/"
              title={isCollapsed ? t('panel.backToSite') : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-thumb px-2.5 text-small font-semibold text-sidebar-muted hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:outline-none',
                isCollapsed && 'justify-center',
              )}
            >
              <ArrowLeftIcon aria-hidden className="size-4.75 shrink-0" />
              <span className={cn(isCollapsed && 'sr-only')}>{t('panel.backToSite')}</span>
            </Link>
          </div>
        ) : null}
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
  area: PanelArea;
  item: ResolvedNavItem;
  count: { value: number; label: string } | undefined;
  isCollapsed: boolean;
};

function SidebarLink({ area, item, count, isCollapsed }: SidebarLinkProps) {
  const Icon = item.icon;
  const hasCount = count !== undefined && count.value > 0;

  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.isExact ?? false }}
      title={isCollapsed ? item.label : undefined}
      className={sidebarLinkVariants({ area, isCollapsed })}
    >
      <span className={sidebarIconVariants({ area })}>
        <Icon aria-hidden className={area === 'admin' ? 'size-4.75' : 'size-4.5'} />
      </span>
      <span className={cn('min-w-0 flex-1', isCollapsed && 'sr-only')}>{item.label}</span>
      {hasCount ? (
        <>
          <span
            aria-hidden
            className={cn(
              'grid h-5 min-w-5.5 place-items-center rounded-full bg-sidebar-count px-1.75 text-nav-count font-extrabold text-sidebar-count-foreground tabular-nums group-data-[status=active]:bg-sidebar-primary-foreground group-data-[status=active]:text-on-inverse',
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
