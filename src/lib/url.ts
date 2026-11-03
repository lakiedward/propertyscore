export function safeRedirectPath(value: string | undefined, fallback = '/'): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
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
