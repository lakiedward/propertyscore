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

const SHARE_TOKEN_PARAM = /((?:^|[?&#]|%3F|%26)share(?:=|%3D))[^&#\s"'%]+/gi;

const REDACTED = '[redacted]';

export function redactShareToken(text: string): string {
  return text.replace(SHARE_TOKEN_PARAM, `$1${REDACTED}`);
}

export function redactShareTokensIn<T extends object>(target: T): T {
  const visited = new WeakSet<object>();
  const visit = (node: object) => {
    if (visited.has(node)) {
      return;
    }
    visited.add(node);
    const entries: [string, unknown][] = Object.entries(node);
    for (const [key, value] of entries) {
      if (typeof value === 'string') {
        Reflect.set(node, key, redactShareToken(value));
      } else if (typeof value === 'object' && value !== null) {
        visit(value);
      }
    }
  };
  visit(target);
  return target;
}
