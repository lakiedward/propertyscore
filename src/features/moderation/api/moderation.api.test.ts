import { http, HttpResponse } from 'msw';
import { buildReviewListing } from '@/test/factories/moderation';
import { moderationListingsResponse } from '@/test/msw/handlers/moderation';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import {
  decideListing,
  getModerationCounts,
  getModerationListing,
  listModerationQueue,
  QUEUE_PAGE_SIZE,
} from './moderation.api';

function recordRequests() {
  const requests: Request[] = [];
  server.events.on('request:start', ({ request }) => {
    requests.push(request.clone());
  });
  return requests;
}

describe('moderation.api', () => {
  afterEach(() => {
    server.events.removeAllListeners();
  });

  describe('getModerationCounts', () => {
    it('counts every moderation status, leaves drafts out and fills the missing ones with 0', async () => {
      server.use(
        http.post(supabaseUrl('/rest/v1/rpc/listing_moderation_counts'), () =>
          HttpResponse.json([
            { status: 'draft', total: 9 },
            { status: 'pending_approval', total: 3 },
          ]),
        ),
      );

      await expect(getModerationCounts()).resolves.toEqual({
        pending_approval: 3,
        approved: 0,
        rejected: 0,
        blocked: 0,
      });
    });
  });

  describe('listModerationQueue', () => {
    it('sorts the listings in review by when they were sent and asks for one page', async () => {
      const requests = recordRequests();

      await listModerationQueue('pending_approval', 1);

      const params = new URL(requests[0]?.url ?? '').searchParams;
      expect(params.get('status')).toBe('eq.pending_approval');
      expect(params.get('order')).toBe('submitted_at.desc.nullslast,id.desc');
      expect(params.get('offset')).toBe(String(QUEUE_PAGE_SIZE));
    });

    it('sorts the decided listings by when they were decided', async () => {
      const requests = recordRequests();

      await listModerationQueue('approved');

      const params = new URL(requests[0]?.url ?? '').searchParams;
      expect(params.get('order')).toBe('decided_at.desc.nullslast,id.desc');
    });
  });

  describe('getModerationListing', () => {
    it('never shows a draft and reports a missing listing as not found', async () => {
      const requests = recordRequests();

      await expect(
        getModerationListing('e0000000-0000-4000-8000-999999999999'),
      ).rejects.toMatchObject({ code: 'not_found' });
      expect(new URL(requests[0]?.url ?? '').searchParams.get('status')).toBe('neq.draft');
    });

    it('loads the published version next to a revision', async () => {
      const published = buildReviewListing({ status: 'approved' });
      const revision = buildReviewListing({ revision_of: published.id });
      server.use(
        http.get(supabaseUrl('/rest/v1/listings'), ({ request }) => {
          const id = new URL(request.url).searchParams.get('id')?.replace(/^eq\./, '');
          return id === published.id ? HttpResponse.json([published]) : undefined;
        }),
        moderationListingsResponse([revision]),
      );

      const listing = await getModerationListing(revision.id);

      expect(listing.original?.id).toBe(published.id);
    });
  });

  describe('decideListing', () => {
    it('sends an empty message when an approval has none', async () => {
      let body: unknown;
      server.use(
        http.post(supabaseUrl('/rest/v1/rpc/decide_listing'), async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ id: 'd1', decision: 'approved' });
        }),
      );

      await decideListing({ listingId: 'e1', decision: 'approved', reasons: [], message: null });

      expect(body).toEqual({
        p_listing_id: 'e1',
        p_decision: 'approved',
        p_reasons: [],
        p_message: '',
      });
    });
  });
});
