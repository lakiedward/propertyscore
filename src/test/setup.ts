import '@testing-library/jest-dom/vitest';
import '@/i18n/i18n';
import { changeLocale } from '@/i18n/i18n';
import { server } from './msw/server';

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
