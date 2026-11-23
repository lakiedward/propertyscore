import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { LngLat } from '@/components/map/map.config';
import { reverseGeocode, searchAddresses } from './geocoding.api';
import {
  createOnlineReport,
  getReport,
  getSharedReport,
  hasUnlimitedSmartCheck,
  listMyReports,
} from './smart-check.api';

const GENERATING_REFRESH_MS = 5_000;
const GEOCODING_STALE_MS = 24 * 60 * 60 * 1000;
const GEOCODING_RETRIES = 1;
const IN_PROGRESS_STATUSES = new Set(['queued', 'generating']);

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
      refetchInterval: (query) =>
        IN_PROGRESS_STATUSES.has(query.state.data?.status ?? '') ? GENERATING_REFRESH_MS : false,
    }),
  sharedReport: (id: string, token: string) =>
    queryOptions({
      queryKey: [...smartCheckQueries.reports(), 'shared', id, token],
      queryFn: () => getSharedReport(id, token),
    }),
  addressSearch: (query: string) =>
    queryOptions({
      queryKey: [...smartCheckQueries.all(), 'address-search', query],
      queryFn: ({ signal }) => searchAddresses(query, signal),
      staleTime: GEOCODING_STALE_MS,
      retry: GEOCODING_RETRIES,
    }),
  reverseAddress: (position: LngLat) =>
    queryOptions({
      queryKey: [...smartCheckQueries.all(), 'reverse-address', ...position],
      queryFn: ({ signal }) => reverseGeocode(position, signal),
      staleTime: GEOCODING_STALE_MS,
      retry: GEOCODING_RETRIES,
    }),
  unlimitedAccess: (userId: string) =>
    queryOptions({
      queryKey: [...smartCheckQueries.all(), 'unlimited', userId],
      queryFn: () => hasUnlimitedSmartCheck(userId),
    }),
};

export function useCreateOnlineReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOnlineReport,
    meta: { silent: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: smartCheckQueries.reports() }),
  });
}
