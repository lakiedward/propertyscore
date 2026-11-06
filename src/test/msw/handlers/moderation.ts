import { http, HttpResponse } from 'msw';
import { supabaseUrl } from '../supabase-url';

export const SEEDED_MODERATION_COUNTS = [
  { status: 'pending_approval', total: 3 },
  { status: 'approved', total: 13 },
  { status: 'rejected', total: 1 },
  { status: 'blocked', total: 1 },
] as const;

export const moderationHandlers = [
  http.post(supabaseUrl('/rest/v1/rpc/listing_moderation_counts'), () =>
    HttpResponse.json(SEEDED_MODERATION_COUNTS),
  ),
];
