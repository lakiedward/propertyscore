import { http, HttpResponse } from 'msw';
import type { ReviewListing } from '@/features/moderation';
import { buildReviewListing, toQueueListing } from '@/test/factories/moderation';
import { supabaseUrl } from '../supabase-url';

export const SEEDED_REVIEW_LISTINGS: ReviewListing[] = [
  buildReviewListing({ title: 'Apartament 3 camere, Complex' }),
  buildReviewListing({ title: 'Garsonieră, Circumvalațiunii', transaction: 'rent', price: 450 }),
];

export const SEEDED_MODERATION_COUNTS = [
  { status: 'pending_approval', total: 2 },
  { status: 'approved', total: 13 },
  { status: 'rejected', total: 1 },
  { status: 'blocked', total: 1 },
] as const;

export function moderationListingsResponse(listings: readonly ReviewListing[]) {
  return http.get(supabaseUrl('/rest/v1/listings'), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const select = params.get('select') ?? '';
    if (!select.includes('submitted_at')) {
      return undefined;
    }
    const status = params.get('status')?.replace(/^eq\./, '');
    const id = params.get('id')?.replace(/^eq\./, '');
    if (select.includes('decisions')) {
      return HttpResponse.json(listings.filter((listing) => listing.id === id));
    }
    const items = listings.filter((listing) => listing.status === status).map(toQueueListing);
    const last = Math.max(items.length - 1, 0);
    return HttpResponse.json(items, {
      headers: { 'Content-Range': `0-${String(last)}/${String(items.length)}` },
    });
  });
}

export const moderationHandlers = [
  http.post(supabaseUrl('/rest/v1/rpc/listing_moderation_counts'), () =>
    HttpResponse.json(SEEDED_MODERATION_COUNTS),
  ),
  moderationListingsResponse(SEEDED_REVIEW_LISTINGS),
  http.post(supabaseUrl('/rest/v1/rpc/decide_listing'), async ({ request }) => {
    const body: unknown = await request.json();
    const field = (name: string): unknown =>
      typeof body === 'object' && body !== null && name in body
        ? Object.getOwnPropertyDescriptor(body, name)?.value
        : undefined;
    return HttpResponse.json({
      id: 'd1000000-0000-4000-8000-000000000001',
      listing_id: field('p_listing_id'),
      decision: field('p_decision'),
      reasons: field('p_reasons'),
      message: field('p_message') === '' ? null : field('p_message'),
      decided_by: 'a0000000-0000-4000-8000-000000000004',
      created_at: '2026-11-06T12:00:00.000Z',
    });
  }),
];
