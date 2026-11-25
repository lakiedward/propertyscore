import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { CORS_HEADERS, errorResponse, jsonResponse, logEvent } from '../_shared/http.ts';
import type { ReportPdfResponse } from '../_shared/types.ts';

const PDF_BUCKET = 'online-report-pdfs';
const SIGNED_URL_SECONDS = 60;

const tokenSchema = z.string().regex(/^[0-9a-f]{48}$/u);
const requestSchema = z.union([
  z.object({
    reportId: z.uuid(),
    locale: z.enum(['ro', 'en']),
    token: tokenSchema.optional(),
  }),
  z.object({
    reportId: z.uuid(),
    locale: z.undefined(),
    token: tokenSchema,
  }),
]);

const sharedPdfSchema = z.object({
  pdf_path: z.string().min(1),
  number: z.number().int(),
});

const pdfVariantSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending') }),
  z.object({ status: z.literal('unavailable') }),
  z.object({ status: z.literal('ready'), path: z.string().min(1), number: z.number().int() }),
]);

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
  const { reportId, token, locale } = parsed.data;

  const supabase = secretClient();
  if (locale !== undefined) {
    let ownerId: string | undefined;
    if (token === undefined) {
      const jwt = /^Bearer (\S+)$/iu.exec(request.headers.get('Authorization') ?? '')?.[1];
      if (!jwt) return errorResponse('not_found', 404);
      const { data: auth, error: authError } = await supabase.auth.getUser(jwt);
      if (authError || !auth.user) return errorResponse('not_found', 404);
      ownerId = auth.user.id;
    }
    const { data, error } = await supabase.rpc('request_online_report_pdf_variant', {
      p_report_id: reportId,
      p_locale: locale,
      p_owner_id: ownerId,
      p_token: token,
    });
    if (error) throw new Error(`report_pdf_variant_failed: ${error.code}`);
    if (data === null) return errorResponse('not_found', 404);
    const variant = pdfVariantSchema.parse(data);
    if (variant.status !== 'ready') {
      return jsonResponse({ status: variant.status } satisfies ReportPdfResponse);
    }
    const url = await signPdf(supabase, variant.path, `${variant.number}-${locale}`);
    if (!url) return errorResponse('not_found', 404);
    const signedUrl = new URL(url);
    return jsonResponse({
      status: 'ready',
      downloadPath: signedUrl.pathname + signedUrl.search,
    } satisfies ReportPdfResponse);
  }

  const { data, error } = await supabase
    .rpc('shared_report_pdf', { p_report_id: reportId, p_token: token })
    .maybeSingle();
  if (error) throw new Error(`shared_report_pdf_failed: ${error.code}`);

  const pdf = sharedPdfSchema.safeParse(data);
  if (!pdf.success) {
    logEvent(requestId, 'shared_pdf_not_found');
    return errorResponse('not_found', 404);
  }

  const url = await signPdf(supabase, pdf.data.pdf_path, String(pdf.data.number));
  if (!url) {
    logEvent(requestId, 'shared_pdf_missing_object');
    return errorResponse('not_found', 404);
  }

  logEvent(requestId, 'shared_pdf_signed');
  return jsonResponse({ url });
}

async function signPdf(supabase: ReturnType<typeof secretClient>, path: string, name: string) {
  const { data, error } = await supabase.storage
    .from(PDF_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS, {
      download: `PropertyScore-SmartCheck-${name}.pdf`,
    });
  return error ? null : data.signedUrl;
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
