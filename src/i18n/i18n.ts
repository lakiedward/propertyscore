import i18n, { type BackendModule, type ResourceKey } from 'i18next';
import { initReactI18next } from 'react-i18next';
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import roAuth from './locales/ro/auth.json';
import roCommon from './locales/ro/common.json';
import { configureValidationMessages } from './validation';

export const SUPPORTED_LOCALES = ['ro', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'ro';

const LOCALE_STORAGE_KEY = 'locale';

export const resources = {
  ro: {
    common: roCommon,
    auth: roAuth,
  },
  en: {
    common: enCommon,
    auth: enAuth,
  },
} as const;

const BUNDLED_NAMESPACES = ['common', 'auth'] as const;
export const FEATURE_NAMESPACES = [
  'home',
  'listings',
  'publish',
  'onlineReports',
  'moderation',
  'myListings',
] as const;
export type FeatureNamespace = (typeof FEATURE_NAMESPACES)[number];

const featureBundles = import.meta.glob<ResourceKey>(
  ['./locales/*/*.json', '!./locales/*/common.json', '!./locales/*/auth.json'],
  { import: 'default' },
);

const featureNamespaceBackend: BackendModule = {
  type: 'backend',
  init: () => undefined,
  read(language, namespace, callback) {
    const load = featureBundles[`./locales/${language}/${namespace}.json`];
    if (!load) {
      callback(null, {});
      return;
    }
    load().then(
      (bundle) => {
        callback(null, bundle);
      },
      (error: unknown) => {
        callback(error instanceof Error ? error : new Error(String(error)), false);
      },
    );
  },
};

export async function loadFeatureNamespaces(namespaces: readonly FeatureNamespace[]) {
  await i18n.loadNamespaces([...namespaces]);
}

export function isLocale(value: unknown): value is Locale {
  return SUPPORTED_LOCALES.some((locale) => locale === value);
}

function readStoredLocale(): Locale | undefined {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

function storeLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    return;
  }
}

function detectInitialLocale(): Locale {
  return readStoredLocale() ?? DEFAULT_LOCALE;
}

export function currentLocale(): Locale {
  return isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : DEFAULT_LOCALE;
}

export async function changeLocale(locale: Locale) {
  storeLocale(locale);
  await i18n.changeLanguage(locale);
}

configureValidationMessages();

void i18n
  .use(featureNamespaceBackend)
  .use(initReactI18next)
  .init({
    resources,
    partialBundledLanguages: true,
    lng: detectInitialLocale(),
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    defaultNS: 'common',
    ns: [...BUNDLED_NAMESPACES],
    interpolation: { escapeValue: false },
    initAsync: false,
  });

document.documentElement.lang = currentLocale();

i18n.on('languageChanged', () => {
  document.documentElement.lang = currentLocale();
});

export { i18n };
