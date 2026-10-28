export type HomeSectionId =
  | 'main'
  | 'smart-check'
  | 'physical'
  | 'deliverables'
  | 'listing-included'
  | 'listings'
  | 'partners'
  | 'pricing'
  | 'questions';

export const HOME_SECTION = {
  main: 'main',
  smartCheck: 'smart-check',
  physical: 'physical',
  deliverables: 'deliverables',
  listingIncluded: 'listing-included',
  listings: 'listings',
  partners: 'partners',
  pricing: 'pricing',
  questions: 'questions',
} as const satisfies Record<string, HomeSectionId>;

export const HOME_SECTION_LINKS = [
  { id: 'smart-check', labelKey: 'site.sections.smartCheck' },
  { id: 'physical', labelKey: 'site.sections.physical' },
  { id: 'deliverables', labelKey: 'site.sections.deliverables' },
  { id: 'listings', labelKey: 'site.sections.listings' },
  { id: 'pricing', labelKey: 'site.sections.pricing' },
  { id: 'questions', labelKey: 'site.sections.questions' },
] as const satisfies readonly { id: HomeSectionId; labelKey: string }[];

export const HOME_SECTION_IDS = HOME_SECTION_LINKS.map((link) => link.id);
