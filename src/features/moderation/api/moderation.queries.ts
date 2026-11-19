import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { listingQueries } from '@/features/listings';
import type { ModerationStatus } from '../moderation.types';
import {
  QUEUE_PAGE_SIZE,
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
    infiniteQueryOptions({
      queryKey: [...moderationQueries.queues(), status],
      queryFn: ({ pageParam }) => listModerationQueue(status, pageParam),
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) =>
        pages.length * QUEUE_PAGE_SIZE < lastPage.total ? pages.length : undefined,
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
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: moderationQueries.all() }),
        queryClient.invalidateQueries({ queryKey: listingQueries.all() }),
      ]),
  });
}
