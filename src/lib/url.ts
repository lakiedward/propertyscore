export function safeRedirectPath(value: string | undefined, fallback = '/account'): string {
  if (!value?.startsWith('/')) {
    return fallback;
  }
  const origin = window.location.origin;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || url.pathname.startsWith('//')) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

const SENSITIVE_PARAM =
  /((?:^|[?&#]|%3F|%26)(?:share|token_hash|code|access_token|refresh_token)(?:=|%3D))[^&#\s"'%]+/gi;

const REDACTED = '[redacted]';

export function redactSensitiveParams(text: string): string {
  return text.replace(SENSITIVE_PARAM, `$1${REDACTED}`);
}

export function redactSensitiveParamsIn<T extends object>(target: T): T {
  const visited = new WeakSet<object>();
  const visit = (node: object) => {
    if (visited.has(node)) {
      return;
    }
    visited.add(node);
    const entries: [string, unknown][] = Object.entries(node);
    for (const [key, value] of entries) {
      if (typeof value === 'string') {
        Reflect.set(node, key, redactSensitiveParams(value));
      } else if (typeof value === 'object' && value !== null) {
        visit(value);
      }
    }
  };
  visit(target);
  return target;
}
