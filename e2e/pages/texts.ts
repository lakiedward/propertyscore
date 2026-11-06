import enAuth from '../../src/i18n/locales/en/auth.json' with { type: 'json' };
import enCommon from '../../src/i18n/locales/en/common.json' with { type: 'json' };
import roAuth from '../../src/i18n/locales/ro/auth.json' with { type: 'json' };
import roCommon from '../../src/i18n/locales/ro/common.json' with { type: 'json' };

export const AUTH_TEXT = { ro: roAuth, en: enAuth } as const;

export const COMMON_TEXT = { ro: roCommon, en: enCommon } as const;

export type E2eLocale = keyof typeof AUTH_TEXT;
