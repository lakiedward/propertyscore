import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { DownloadIcon, SearchIcon } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { LoadMoreButton } from '@/components/layout/load-more-button';
import { FilterChip } from '@/components/property/filter-chip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn, oneOf } from '@/lib/utils';
import { staffQueries } from '../api/staff.queries';
import { USER_STATE_FILTERS, type AppRole, type StaffUser } from '../staff.types';
import { downloadCsv, usersToCsv } from '../staff.utils';
import { UserRow } from './user-row';

const ROLE_FILTERS = ['user', 'inspector', 'admin'] as const satisfies readonly AppRole[];

const SEARCH_DEBOUNCE_MS = 250;

const ALL_CITIES = 'all';

const route = getRouteApi('/_authenticated/admin/users');

export function UsersPage() {
  const { t } = useTranslation('staff');
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const searchId = useId();
  const [query, setQuery] = useState(search.q);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const filters = {
    search: debouncedQuery,
    role: search.role ?? null,
    state: search.state,
    cityId: search.city ?? null,
  };
  const users = useInfiniteQuery(staffQueries.users(filters));
  const counts = useQuery(staffQueries.roleCounts());
  const cities = useQuery(staffQueries.cities());
  const items: StaffUser[] = users.data?.pages.flatMap((page) => page.items) ?? [];
  const total = users.data?.pages[0]?.total ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-labelledby={`${searchId}-title`}
        className="overflow-hidden rounded-lg border border-card bg-card shadow-card-soft"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id={`${searchId}-title`} className="text-title-3xs leading-snug font-bold">
                {t('users.card.title')}
              </h2>
              <p className="text-meta text-muted-foreground">
                {t('users.card.shown', { count: total, shown: items.length })}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="md"
              className="touch-target"
              disabled={items.length === 0}
              onClick={() => {
                downloadCsv(
                  usersToCsv(items, {
                    name: t('users.columns.name'),
                    email: t('users.columns.email'),
                    phone: t('users.columns.phone'),
                    roles: t('users.columns.roles'),
                    created: t('users.columns.created'),
                    status: t('users.columns.status'),
                    active: t('users.state.active'),
                    blocked: t('users.state.blocked'),
                  }),
                  t('users.csvFileName'),
                );
              }}
            >
              <DownloadIcon aria-hidden />
              {t('users.export')}
            </Button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <label htmlFor={searchId} className="sr-only">
                {t('users.search.label')}
              </label>
              <SearchIcon
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id={searchId}
                type="search"
                value={query}
                placeholder={t('users.search.placeholder')}
                onChange={(event) => {
                  setQuery(event.target.value);
                  void navigate({
                    search: (previous) => ({ ...previous, q: event.target.value }),
                    replace: true,
                  });
                }}
                className="h-10 pl-9 text-body-sm"
              />
            </div>
            <Select
              value={search.city ?? ALL_CITIES}
              onValueChange={(value) => {
                void navigate({
                  search: (previous) => ({
                    ...previous,
                    city: value === ALL_CITIES ? undefined : value,
                  }),
                });
              }}
            >
              <SelectTrigger aria-label={t('users.city.label')} className="h-10 sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CITIES}>{t('users.city.all')}</SelectItem>
                {(cities.data ?? []).map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={search.state}
              onValueChange={(value) => {
                const state = oneOf(USER_STATE_FILTERS, value);
                if (state) {
                  void navigate({ search: (previous) => ({ ...previous, state }) });
                }
              }}
            >
              <SelectTrigger aria-label={t('users.status.label')} className="h-10 sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_STATE_FILTERS.map((state) => (
                  <SelectItem key={state} value={state}>
                    {t(`users.status.${state}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div role="group" aria-label={t('users.roles.label')} className="flex flex-wrap gap-2">
            <FilterChip
              label={t('users.roles.all')}
              count={counts.data?.total}
              isSelected={!search.role}
              onSelectedChange={() => {
                void navigate({ search: (previous) => ({ ...previous, role: undefined }) });
              }}
            />
            {ROLE_FILTERS.map((role) => (
              <FilterChip
                key={role}
                label={t(`users.roles.${role}`)}
                count={counts.data?.counts[role] ?? 0}
                isSelected={search.role === role}
                onSelectedChange={() => {
                  void navigate({ search: (previous) => ({ ...previous, role }) });
                }}
              />
            ))}
          </div>
        </div>
        {users.isPending ? (
          <div className="flex flex-col gap-2 p-5">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : users.isError && !users.data ? (
          <div className="p-5">
            <EmptyState kind="error" title={t('users.error')} />
          </div>
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState title={t('users.empty.title')} description={t('users.empty.description')} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[56rem]">
              <TableHeader className="bg-background">
                <TableRow className="border-border">
                  <ColumnHead className="px-5">{t('users.columns.name')}</ColumnHead>
                  <ColumnHead>{t('users.columns.email')}</ColumnHead>
                  <ColumnHead>{t('users.columns.phone')}</ColumnHead>
                  <ColumnHead>{t('users.columns.roles')}</ColumnHead>
                  <ColumnHead>{t('users.columns.created')}</ColumnHead>
                  <ColumnHead>{t('users.columns.status')}</ColumnHead>
                  <TableHead className="w-10 px-5">
                    <span className="sr-only">{t('users.columns.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((user) => (
                  <UserRow key={user.user_id} user={user} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {users.hasNextPage ? (
          <div className="flex justify-center border-t border-border-subtle p-4">
            <LoadMoreButton
              label={t('users.more')}
              isLoading={users.isFetchingNextPage}
              onLoadMore={() => void users.fetchNextPage()}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}

type ColumnHeadProps = {
  className?: string;
  children: ReactNode;
};

function ColumnHead({ className, children }: ColumnHeadProps) {
  return (
    <TableHead
      className={cn(
        'text-meta font-bold tracking-eyebrow text-muted-foreground uppercase',
        className,
      )}
    >
      {children}
    </TableHead>
  );
}
