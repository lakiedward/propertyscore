import { queryOptions } from '@tanstack/react-query';
import { getModerationCounts } from './moderation.api';

export const moderationQueries = {
  all: () => ['moderation'] as const,
  counts: () =>
    queryOptions({
      queryKey: [...moderationQueries.all(), 'counts'],
      queryFn: getModerationCounts,
    }),
};
