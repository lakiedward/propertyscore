const SEED_PASSWORD = 'Parola-Test-2026';

export const testUsers = {
  ro: {
    email: 'ana.ro@example.test',
    password: SEED_PASSWORD,
    locale: 'ro',
    fullName: 'Ana Mărginean',
  },
  en: {
    email: 'emma.en@example.test',
    password: SEED_PASSWORD,
    locale: 'en',
    fullName: 'Emma Stănescu',
  },
  otherRo: {
    email: 'ion.ro@example.test',
    password: SEED_PASSWORD,
    locale: 'ro',
    fullName: 'Ion Țurcanu',
  },
  admin: {
    email: 'admin.ro@example.test',
    password: SEED_PASSWORD,
    locale: 'ro',
    fullName: 'Radu Marin',
  },
} as const;

export type TestUserName = keyof typeof testUsers;

export function storageStatePath(name: TestUserName): string {
  return `e2e/.auth/${name}.json`;
}
