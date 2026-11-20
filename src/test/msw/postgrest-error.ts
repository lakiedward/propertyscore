import { HttpResponse } from 'msw';

export function postgrestErrorResponse(code: string, message: string, status: number) {
  return HttpResponse.json({ code, message, details: null, hint: null }, { status });
}
