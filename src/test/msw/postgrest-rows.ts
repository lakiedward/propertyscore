import { HttpResponse } from 'msw';

export function postgrestRows(request: Request, items: readonly object[]) {
  const accept = request.headers.get('Accept') ?? '';
  if (accept.includes('vnd.pgrst.object')) {
    return HttpResponse.json(items[0] ?? null);
  }
  return HttpResponse.json(items);
}
