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
  createShareLink,
  getActiveShareLink,
  getReport,
  getSharedReport,
  getSharedReportPdfUrl,
  hasUnlimitedSmartCheck,
  listMyReports,
  revokeShareLink,
} from './smart-check.api';
import { getReportPdfUrl } from './smart-check.storage';

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
      refetchInterval: (query) =>
        query.state.data?.pages.some((page) =>
          page.items.some((report) => IN_PROGRESS_STATUSES.has(report.status)),
        )
          ? GENERATING_REFRESH_MS
          : false,
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
  shareLink: (reportId: string) =>
    queryOptions({
      queryKey: [...smartCheckQueries.reports(), 'share-link', reportId],
      queryFn: () => getActiveShareLink(reportId),
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

export type ReportPdfRequest =
  | { pdfPath: string; reportNumber: number; reportId?: never; shareToken?: never }
  | { reportId: string; shareToken: string; pdfPath?: never; reportNumber?: never };

export function useReportPdfUrl() {
  return useMutation({
    mutationFn: (source: ReportPdfRequest) =>
      source.shareToken === undefined
        ? getReportPdfUrl(source.pdfPath, source.reportNumber)
        : getSharedReportPdfUrl(source.reportId, source.shareToken),
    meta: { silent: true },
  });
}

export function useCreateShareLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createShareLink,
    meta: { silent: true },
    onSuccess: (_token, { reportId }) =>
      queryClient.invalidateQueries({ queryKey: smartCheckQueries.shareLink(reportId).queryKey }),
  });
}

export function useRevokeShareLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeShareLink,
    meta: { silent: true },
    onSuccess: (_result, reportId) =>
      queryClient.invalidateQueries({ queryKey: smartCheckQueries.shareLink(reportId).queryKey }),
  });
}
