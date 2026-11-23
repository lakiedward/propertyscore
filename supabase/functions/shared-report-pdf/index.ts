import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { CORS_HEADERS, errorResponse, jsonResponse, logEvent } from '../_shared/http.ts';
import type { SharedReportPdfResponse } from '../_shared/types.ts';

const PDF_BUCKET = 'online-report-pdfs';
const SIGNED_URL_SECONDS = 60;

const requestSchema = z.object({
  reportId: z.uuid(),
  token: z.string().regex(/^[0-9a-f]{48}$/u),
});

const sharedPdfSchema = z.object({
  pdf_path: z.string().min(1),
  number: z.number().int(),
});

function secretClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('missing_supabase_env');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function handle(request: Request, requestId: string) {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (request.method !== 'POST') return errorResponse('method_not_allowed', 405);

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse('invalid_request', 400);
  const { reportId, token } = parsed.data;

  const supabase = secretClient();
  const { data, error } = await supabase
    .rpc('shared_report_pdf', { p_report_id: reportId, p_token: token })
    .maybeSingle();
  if (error) throw new Error(`shared_report_pdf_failed: ${error.code}`);

  const pdf = sharedPdfSchema.safeParse(data);
  if (!pdf.success) {
    logEvent(requestId, 'shared_pdf_not_found');
    return errorResponse('not_found', 404);
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(PDF_BUCKET)
    .createSignedUrl(pdf.data.pdf_path, SIGNED_URL_SECONDS, {
      download: `PropertyScore-SmartCheck-${String(pdf.data.number)}.pdf`,
    });
  if (signError) {
    logEvent(requestId, 'shared_pdf_missing_object');
    return errorResponse('not_found', 404);
  }

  logEvent(requestId, 'shared_pdf_signed');
  const body: SharedReportPdfResponse = { url: signed.signedUrl };
  return jsonResponse(body);
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();
  try {
    return await handle(request, requestId);
  } catch (error) {
    logEvent(requestId, 'shared_pdf_failed', {
      reason: error instanceof Error ? error.message : 'unknown',
    });
    return errorResponse('internal', 500);
  }
});
