import { queryOptions } from '@tanstack/react-query';
import { getOnlineReport } from './online-reports.api';

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
};
