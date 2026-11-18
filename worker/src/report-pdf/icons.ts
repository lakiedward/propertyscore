import { esc } from './format.ts';

const ICON_PATHS = {
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  shield:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  bus: '<path d="M8 6v6M16 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3M9 18h5"/><circle cx="7" cy="18" r="2"/><circle cx="16" cy="18" r="2"/>',
  map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  vol: '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="M16 9a5 5 0 0 1 0 6M19.4 18.4a9 9 0 0 0 0-12.8"/>',
  wind: '<path d="M12.8 19.6A2 2 0 1 0 14 16H2M17.5 8a2.5 2.5 0 1 1 2 4H2M9.8 4.4A2 2 0 1 1 11 8H2"/>',
  fac: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1M12 18h1M7 18h1"/>',
  act: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
  trend: '<path d="M22 7 13.5 15.5l-5-5L2 17M16 7h6v6"/>',
  cap: '<path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  heart:
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  up: '<path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  pdf: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M12 18v-6M9 15l3 3 3-3"/>',
  share:
    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>',
  arr: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  refresh:
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M3 21v-5h5"/>',
  pin: '<path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  house:
    '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6a2 2 0 0 1 .7 1.5v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  layers:
    '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m2 12 8.58 3.91a2 2 0 0 0 1.66 0L21 12M2 17l8.58 3.91a2 2 0 0 0 1.66 0L21 17"/>',
  cursor: '<path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/>',
  walk: '<circle cx="13" cy="4" r="2"/><path d="m9 20 3-6 3 3v4M7 11l3-3 4 1 3 3M12 14l-2-5"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  chevd: '<path d="m6 9 6 6 6-6"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
  glass:
    '<path d="M8 22h8M7 10h10M12 15v7M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/>',
  flame:
    '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  train:
    '<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1M9 15l-1-1M15 15l1-1M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5ZM8 19l-2 3M16 19l2 3"/>',
  tunnel: '<path d="M3 21V11a9 9 0 0 1 18 0v10"/><path d="M8 21v-8a4 4 0 0 1 8 0v8"/>',
  pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  cup: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
  phone:
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  plane:
    '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  mall: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
  uni: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  rail: '<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1M9 15l-1-1M15 15l1-1M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5ZM8 19l-2 3M16 19l2 3"/>',
  school: '<path d="M4 21V10l8-6 8 6v11"/><path d="M9 21v-6h6v6M3 21h18"/>',
  tree: '<path d="M12 22v-7"/><path d="M8 15h8l-2.5-4H16l-4-8-4 8h2.5Z"/>',
  dumb: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/>',
  bank: '<path d="M3 21h18M5 21V10M19 21V10M9.5 21V10M14.5 21V10M2 10l10-6 10 6Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5A2.5 2.5 0 0 0 4 21.5 2.5 2.5 0 0 0 6.5 24"/><path d="M8 7h8"/>',
  ticket:
    '<path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3Z"/><path d="M13 6v12"/>',
  paw: '<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="6" r="1.8"/><circle cx="15" cy="6" r="1.8"/><circle cx="19" cy="9" r="1.8"/><path d="M13 12c-3 0-6 4-6 6.5 0 1.7 1.5 2.5 3 2l3-1 3 1c1.5.5 3-.3 3-2C19 16 16 12 13 12Z"/>',
  slide: '<path d="M5 21V8a3 3 0 0 1 6 0v13M5 13h6M11 9l8 12"/>',
  tooth:
    '<path d="M12 5.5C10.5 4 8 3.5 6.5 4.5 4.5 6 4.6 9 5.5 11.5c.7 2 .9 4 1.3 6.3.3 1.6 2.2 2 2.7.4L11 13h2l1.5 5.2c.5 1.6 2.4 1.2 2.7-.4.4-2.3.6-4.3 1.3-6.3.9-2.5 1-5.5-1-7C16 3.5 13.5 4 12 5.5Z"/>',
  bread: '<path d="M5 11a4 4 0 0 1 0-7h14a4 4 0 0 1 0 7v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z"/>',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function icon(name: IconName, className = ''): string {
  return `<svg class="i ${esc(className)}" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}

const LOGO_MARKUP = {
  score:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M15 4h18a11 11 0 0 1 11 11v18a11 11 0 0 1-11 11H15A11 11 0 0 1 4 33V15A11 11 0 0 1 15 4Z" fill="#103F32"></path><path d="M12.5 30a11.5 11.5 0 0 1 23 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path><path d="M29.8 20.1a11.5 11.5 0 0 1 5.7 9.9" fill="none" stroke="#DDED69" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path><path d="M24 30l6.5-7.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M21 30a3 3 0 1 0 6 0a3 3 0 1 0-6 0Z" fill="#fff"></path></svg>',
  scoreDark:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M15 4h18a11 11 0 0 1 11 11v18a11 11 0 0 1-11 11H15A11 11 0 0 1 4 33V15A11 11 0 0 1 15 4Z" fill="#103F32" stroke="#fff" stroke-width="2.5"></path><path d="M12.5 30a11.5 11.5 0 0 1 23 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path><path d="M29.8 20.1a11.5 11.5 0 0 1 5.7 9.9" fill="none" stroke="#DDED69" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path><path d="M24 30l6.5-7.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M21 30a3 3 0 1 0 6 0a3 3 0 1 0-6 0Z" fill="#fff"></path></svg>',
  smart:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M15 4h18a11 11 0 0 1 11 11v18a11 11 0 0 1-11 11H15A11 11 0 0 1 4 33V15A11 11 0 0 1 15 4Z" fill="#3F6478"></path><path d="M24 10.5l11.5 4.2v8.4c0 7.6-5 12.8-11.5 15.4-6.5-2.6-11.5-7.8-11.5-15.4v-8.4Z" fill="#fff"></path><path d="M18.8 24.2l3.7 3.7 6.8-7.3" fill="none" stroke="#3F6478" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M37 7l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1Z" fill="#DDED69" stroke="#3F6478" stroke-width="1.4" stroke-linejoin="round"></path></svg>',
  smartDark:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M15 4h18a11 11 0 0 1 11 11v18a11 11 0 0 1-11 11H15A11 11 0 0 1 4 33V15A11 11 0 0 1 15 4Z" fill="#fff"></path><path d="M24 10.5l11.5 4.2v8.4c0 7.6-5 12.8-11.5 15.4-6.5-2.6-11.5-7.8-11.5-15.4v-8.4Z" fill="#3F6478"></path><path d="M18.8 24.2l3.7 3.7 6.8-7.3" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M37 7l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1Z" fill="#DDED69" stroke="#3F6478" stroke-width="1.4" stroke-linejoin="round"></path></svg>',
  fizic:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M15 4h18a11 11 0 0 1 11 11v18a11 11 0 0 1-11 11H15A11 11 0 0 1 4 33V15A11 11 0 0 1 15 4Z" fill="#DDED69"></path><path d="M11.5 24 23 14.5 34.5 24M14.5 21.5V35h9" fill="none" stroke="#103F32" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path><path d="M26 29.5a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0Z" fill="none" stroke="#103F32" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path><path d="M35.5 33.5l3.8 3.8" fill="none" stroke="#103F32" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
} as const;

export function logo(name: keyof typeof LOGO_MARKUP, className = 'lg'): string {
  return LOGO_MARKUP[name].replace(
    '<svg ',
    `<svg class="${esc(className)}" aria-hidden="true" focusable="false" `,
  );
}
