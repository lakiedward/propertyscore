import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enListings from './locales/en/listings.json';
import roAuth from './locales/ro/auth.json';
import roCommon from './locales/ro/common.json';
import roListings from './locales/ro/listings.json';
import { configureValidationMessages } from './validation';

export const SUPPORTED_LOCALES = ['ro', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'ro';

const LOCALE_STORAGE_KEY = 'locale';

export const resources = {
  ro: { common: roCommon, auth: roAuth, listings: roListings },
  en: { common: enCommon, auth: enAuth, listings: enListings },
} as const;

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

function detectBrowserLocale(): Locale | undefined {
  for (const language of navigator.languages) {
    const prefix = language.toLowerCase().split('-')[0];
    if (isLocale(prefix)) {
      return prefix;
    }
  }
  return undefined;
}

function detectInitialLocale(): Locale {
  return readStoredLocale() ?? detectBrowserLocale() ?? DEFAULT_LOCALE;
}

export function currentLocale(): Locale {
  return isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : DEFAULT_LOCALE;
}

export async function changeLocale(locale: Locale) {
  storeLocale(locale);
  await i18n.changeLanguage(locale);
}

configureValidationMessages();

void i18n.use(initReactI18next).init({
  resources,
  lng: detectInitialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES,
  defaultNS: 'common',
  ns: ['common', 'auth', 'listings'],
  interpolation: { escapeValue: false },
  initAsync: false,
});

document.documentElement.lang = currentLocale();

i18n.on('languageChanged', () => {
  document.documentElement.lang = currentLocale();
});

export { i18n };
