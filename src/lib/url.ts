export function safeRedirectPath(value: string | undefined, fallback = '/account'): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
}
