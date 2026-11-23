import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { getReport, getSharedReport, listMyReports } from './smart-check.api';

const GENERATING_REFRESH_MS = 5_000;

export const smartCheckQueries = {
  all: () => ['smart-check'] as const,
  reports: () => [...smartCheckQueries.all(), 'reports'] as const,
  myReports: (ownerId: string) =>
    infiniteQueryOptions({
      queryKey: [...smartCheckQueries.reports(), 'mine', ownerId],
      queryFn: ({ pageParam }) => listMyReports(pageParam),
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) => {
        const loaded = pages.reduce((count, page) => count + page.items.length, 0);
        return loaded < lastPage.total ? pages.length : undefined;
      },
    }),
  report: (id: string) =>
    queryOptions({
      queryKey: [...smartCheckQueries.reports(), 'detail', id],
      queryFn: () => getReport(id),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === 'queued' || status === 'generating' ? GENERATING_REFRESH_MS : false;
      },
    }),
  sharedReport: (id: string, token: string) =>
    queryOptions({
      queryKey: [...smartCheckQueries.reports(), 'shared', id, token],
      queryFn: () => getSharedReport(id, token),
    }),
};
