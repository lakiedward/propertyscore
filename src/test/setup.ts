import '@testing-library/jest-dom/vitest';
import { changeLocale, i18n } from '@/i18n/i18n';
import enOnlineReports from '@/i18n/locales/en/onlineReports.json';
import roOnlineReports from '@/i18n/locales/ro/onlineReports.json';
import { server } from './msw/server';

const FEATURE_BUNDLES = {
  ro: { onlineReports: roOnlineReports },
  en: { onlineReports: enOnlineReports },
};

for (const [language, bundles] of Object.entries(FEATURE_BUNDLES)) {
  for (const [namespace, bundle] of Object.entries(bundles)) {
    i18n.addResourceBundle(language, namespace, bundle);
  }
}

function matchMediaStub(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  };
}

class ResizeObserverStub {
  observe() {
    return undefined;
  }
  unobserve() {
    return undefined;
  }
  disconnect() {
    return undefined;
  }
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.stubGlobal('matchMedia', matchMediaStub);
  Element.prototype.scrollIntoView = vi.fn();
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(async () => {
  await changeLocale('ro');
});

afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});

afterAll(() => {
  server.close();
});
