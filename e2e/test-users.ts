const SEED_PASSWORD = 'Parola-Test-2026';

export const testUsers = {
  ro: { email: 'ana.ro@example.test', password: SEED_PASSWORD, locale: 'ro' },
  en: { email: 'emma.en@example.test', password: SEED_PASSWORD, locale: 'en' },
  otherRo: { email: 'ion.ro@example.test', password: SEED_PASSWORD, locale: 'ro' },
} as const;

export type TestUserName = keyof typeof testUsers;

export function storageStatePath(name: TestUserName): string {
  return `e2e/.auth/${name}.json`;
}
