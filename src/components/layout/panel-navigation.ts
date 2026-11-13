import {
  CalendarDaysIcon,
  ChartLineIcon,
  ClipboardCheckIcon,
  CreditCardIcon,
  DownloadIcon,
  FilePenLineIcon,
  FileTextIcon,
  HandshakeIcon,
  HeartIcon,
  InboxIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  PackageIcon,
  ReceiptIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import type { FileRouteTypes } from '@/routeTree.gen';

type PanelNavItem<TId extends string> = {
  id: TId;
  to: FileRouteTypes['to'];
  icon: LucideIcon;
  isExact?: boolean;
};

type PanelNavGroup<TGroup extends string, TId extends string> = {
  id: TGroup;
  items: readonly PanelNavItem<TId>[];
};

export const ACCOUNT_NAVIGATION = [
  {
    id: 'activity',
    items: [
      { id: 'overview', to: '/account', icon: LayoutDashboardIcon, isExact: true },
      { id: 'reports', to: '/account/reports', icon: FileTextIcon },
      { id: 'appointments', to: '/account/appointments', icon: CalendarDaysIcon },
      { id: 'requests', to: '/account/requests', icon: InboxIcon },
    ],
  },
  {
    id: 'homes',
    items: [
      { id: 'listings', to: '/account/listings', icon: MegaphoneIcon },
      { id: 'favorites', to: '/account/favorites', icon: HeartIcon },
    ],
  },
  {
    id: 'account',
    items: [
      { id: 'products', to: '/account/products', icon: DownloadIcon },
      { id: 'invoices', to: '/account/invoices', icon: ReceiptIcon },
      { id: 'settings', to: '/account/settings', icon: SettingsIcon },
    ],
  },
] as const satisfies readonly PanelNavGroup<string, string>[];

export const ADMIN_NAVIGATION = [
  {
    id: 'today',
    items: [
      { id: 'dashboard', to: '/admin', icon: LayoutDashboardIcon, isExact: true },
      { id: 'appointments', to: '/admin/appointments', icon: CalendarDaysIcon },
      { id: 'inspections', to: '/admin/inspections', icon: ClipboardCheckIcon },
    ],
  },
  {
    id: 'portal',
    items: [
      { id: 'listings', to: '/admin/listings', icon: MegaphoneIcon },
      { id: 'feedback', to: '/admin/feedback', icon: MessageSquareIcon },
      { id: 'users', to: '/admin/users', icon: UsersIcon },
      { id: 'partners', to: '/admin/partners', icon: HandshakeIcon },
    ],
  },
  {
    id: 'business',
    items: [
      { id: 'payments', to: '/admin/payments', icon: CreditCardIcon },
      { id: 'scoring', to: '/admin/scoring', icon: SlidersHorizontalIcon },
      { id: 'analytics', to: '/admin/analytics', icon: ChartLineIcon },
      { id: 'products', to: '/admin/products', icon: PackageIcon },
      { id: 'content', to: '/admin/content', icon: FilePenLineIcon },
    ],
  },
  {
    id: 'account',
    items: [{ id: 'settings', to: '/admin/settings', icon: SettingsIcon }],
  },
] as const satisfies readonly PanelNavGroup<string, string>[];

export type ResolvedNavItem = PanelNavItem<string> & { label: string };

export type ResolvedNavGroup = { id: string; title: string; items: readonly ResolvedNavItem[] };

export function findCurrentNavItem(
  groups: readonly ResolvedNavGroup[],
  pathname: string,
): ResolvedNavItem | undefined {
  const items = groups.flatMap((group) => group.items);
  return (
    items.find((item) => item.to === pathname) ??
    items.find((item) => !item.isExact && pathname.startsWith(`${item.to}/`))
  );
}
