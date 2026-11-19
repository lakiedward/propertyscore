export const CATEGORY_KEYS = [
  'safety',
  'accessibility',
  'fifteen_minute',
  'green',
  'noise',
  'air',
  'industry',
  'education',
  'health',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export type ContextKey = 'seismic' | 'investment' | 'questions';
