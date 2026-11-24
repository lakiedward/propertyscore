import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { DownloadIcon, SearchIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { LoadMoreButton } from '@/components/layout/load-more-button';
import { FilterChip } from '@/components/property/filter-chip';
import { Button } from '@/components/ui/button';
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
import { oneOf } from '@/lib/utils';
import { staffQueries } from '../api/staff.queries';
import { USER_STATE_FILTERS, type AppRole, type StaffUser } from '../staff.types';
import { downloadCsv, usersToCsv } from '../staff.utils';
import { UserRow } from './user-row';

const ROLE_FILTERS = ['user', 'inspector', 'admin'] as const satisfies readonly AppRole[];

const SEARCH_DEBOUNCE_MS = 250;

const route = getRouteApi('/_authenticated/admin/users');

export function UsersPage() {
  const { t } = useTranslation('staff');
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const searchId = useId();
  const [query, setQuery] = useState(search.q);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const filters = { search: debouncedQuery, role: search.role ?? null, state: search.state };
  const users = useInfiniteQuery(staffQueries.users(filters));
  const counts = useQuery(staffQueries.roleCounts());
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
              <h2 id={`${searchId}-title`} className="text-[17px] leading-snug font-bold">
                {t('users.card.title')}
              </h2>
              <p className="text-meta text-muted-foreground">
                {t('users.card.shown', { count: items.length, total })}
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
            <label
              htmlFor={searchId}
              className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 focus-within:ring-3 focus-within:ring-ring"
            >
              <SearchIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">{t('users.search.label')}</span>
              <input
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
                className="min-w-0 flex-1 bg-transparent text-body-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
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
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState title={t('users.empty.title')} description={t('users.empty.description')} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[56rem]">
              <TableHeader className="bg-background">
                <TableRow className="border-border">
                  <TableHead className="px-5 text-meta font-bold tracking-[0.06em] text-muted-foreground uppercase">
                    {t('users.columns.name')}
                  </TableHead>
                  <TableHead className="text-meta font-bold tracking-[0.06em] text-muted-foreground uppercase">
                    {t('users.columns.email')}
                  </TableHead>
                  <TableHead className="text-meta font-bold tracking-[0.06em] text-muted-foreground uppercase">
                    {t('users.columns.phone')}
                  </TableHead>
                  <TableHead className="text-meta font-bold tracking-[0.06em] text-muted-foreground uppercase">
                    {t('users.columns.roles')}
                  </TableHead>
                  <TableHead className="text-meta font-bold tracking-[0.06em] text-muted-foreground uppercase">
                    {t('users.columns.created')}
                  </TableHead>
                  <TableHead className="text-meta font-bold tracking-[0.06em] text-muted-foreground uppercase">
                    {t('users.columns.status')}
                  </TableHead>
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
