export const PANEL_PATHS = { account: '/account', admin: '/admin' } as const;

export type PanelArea = keyof typeof PANEL_PATHS;

export type PanelPath = (typeof PANEL_PATHS)[PanelArea];

export const PANEL_LINK_KEYS = {
  '/account': 'panel.link.account',
  '/admin': 'panel.link.admin',
} as const satisfies Record<PanelPath, string>;
