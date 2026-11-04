export type SourceMirror = {
  url: string;
  apiKey: string | null;
};

export function privateSourceHeaders(apiKey: string | null): Record<string, string> {
  if (!apiKey) return {};
  return { apikey: apiKey, Authorization: `Bearer ${apiKey}` };
}

export function mirroredSource(
  mirror: SourceMirror,
  objectPath: string,
): { url: string; headers: Record<string, string> } {
  return {
    url: `${mirror.url.replace(/\/+$/, '')}/${objectPath}`,
    headers: privateSourceHeaders(mirror.apiKey),
  };
}
