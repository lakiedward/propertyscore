export function safeRedirectPath(value: string | undefined, fallback = '/account'): string {
  if (!value?.startsWith('/')) {
    return fallback;
  }
  const origin = window.location.origin;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
