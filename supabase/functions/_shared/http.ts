import type { EdgeFunctionError } from './types.ts';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(code: string, status: number) {
  const body: EdgeFunctionError = { error: code };
  return jsonResponse(body, status);
}

export function logEvent(requestId: string, event: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ requestId, event, ...details }));
}
