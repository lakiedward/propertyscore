export const PANEL_PATHS = { account: '/account', admin: '/admin', field: '/field' } as const;

export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'ps-sb-closed';

export type PanelArea = keyof typeof PANEL_PATHS;

export type PanelPath = (typeof PANEL_PATHS)[PanelArea];

export const SETTINGS_PATHS = {
  account: '/account/settings',
  admin: '/admin/settings',
  field: '/field/settings',
} as const satisfies Record<PanelArea, string>;

export type SettingsPath = (typeof SETTINGS_PATHS)[PanelArea];

export const PANEL_LINK_KEYS = {
  '/account': 'panel.link.account',
  '/admin': 'panel.link.admin',
  '/field': 'panel.link.field',
} as const satisfies Record<PanelPath, string>;
