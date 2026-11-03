import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createReportShareLink,
  getActiveShareLink,
  getOnlineReport,
  getSharedOnlineReport,
  revokeReportShareLink,
} from './online-reports.api';

const GENERATING_REFRESH_MS = 5_000;

export const onlineReportQueries = {
  all: () => ['online-reports'] as const,
  detail: (id: string) =>
    queryOptions({
      queryKey: [...onlineReportQueries.all(), 'detail', id],
      queryFn: () => getOnlineReport(id),
      refetchInterval: (query) =>
        query.state.data?.status === 'generating' ? GENERATING_REFRESH_MS : false,
    }),
  shared: (id: string, token: string) =>
    queryOptions({
      queryKey: [...onlineReportQueries.all(), 'shared', id, token],
      queryFn: () => getSharedOnlineReport(id, token),
    }),
  shareLink: (id: string) =>
    queryOptions({
      queryKey: [...onlineReportQueries.all(), 'share-link', id],
      queryFn: () => getActiveShareLink(id),
    }),
};

export function useCreateReportShareLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReportShareLink,
    onSuccess: (_token, { reportId }) =>
      queryClient.invalidateQueries({ queryKey: onlineReportQueries.shareLink(reportId).queryKey }),
  });
}

export function useRevokeReportShareLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeReportShareLink,
    onSuccess: (_result, reportId) =>
      queryClient.invalidateQueries({ queryKey: onlineReportQueries.shareLink(reportId).queryKey }),
  });
}
