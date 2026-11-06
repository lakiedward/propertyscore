import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ModerationStatus } from '../moderation.types';
import {
  decideListing,
  getModerationCounts,
  getModerationListing,
  listModerationQueue,
} from './moderation.api';

export const moderationQueries = {
  all: () => ['moderation'] as const,
  counts: () =>
    queryOptions({
      queryKey: [...moderationQueries.all(), 'counts'],
      queryFn: getModerationCounts,
    }),
  queues: () => [...moderationQueries.all(), 'queue'] as const,
  queue: (status: ModerationStatus) =>
    queryOptions({
      queryKey: [...moderationQueries.queues(), status],
      queryFn: () => listModerationQueue(status),
    }),
  details: () => [...moderationQueries.all(), 'detail'] as const,
  detail: (id: string) =>
    queryOptions({
      queryKey: [...moderationQueries.details(), id],
      queryFn: () => getModerationListing(id),
    }),
};

export function useDecideListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: decideListing,
    meta: { silent: true },
    onSettled: () => queryClient.invalidateQueries({ queryKey: moderationQueries.all() }),
  });
}
