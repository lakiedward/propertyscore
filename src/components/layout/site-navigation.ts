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

const HOME_SECTION_LINKS = [
  { id: 'smart-check', labelKey: 'site.sections.smartCheck' },
  { id: 'physical', labelKey: 'site.sections.physical' },
  { id: 'deliverables', labelKey: 'site.sections.deliverables' },
  { id: 'listings', labelKey: 'site.sections.listings' },
  { id: 'pricing', labelKey: 'site.sections.pricing' },
  { id: 'questions', labelKey: 'site.sections.questions' },
] as const satisfies readonly { id: HomeSectionId; labelKey: string }[];

export type PublishSectionId = 'account' | 'steps' | 'checklist' | 'verified' | 'questions';

export const PUBLISH_SECTION = {
  account: 'account',
  steps: 'steps',
  checklist: 'checklist',
  verified: 'verified',
  questions: 'questions',
} as const satisfies Record<string, PublishSectionId>;

const PUBLISH_SECTION_LINKS = [
  { id: 'account', labelKey: 'site.publishSections.account' },
  { id: 'steps', labelKey: 'site.publishSections.steps' },
  { id: 'checklist', labelKey: 'site.publishSections.checklist' },
  { id: 'verified', labelKey: 'site.publishSections.verified' },
  { id: 'questions', labelKey: 'site.publishSections.questions' },
] as const satisfies readonly { id: PublishSectionId; labelKey: string }[];

export type SectionNav =
  | { page: '/'; links: typeof HOME_SECTION_LINKS }
  | { page: '/publish'; links: typeof PUBLISH_SECTION_LINKS };

const PUBLISH_PATH = '/publish';

export function sectionNavFor(pathname: string): SectionNav {
  if (pathname === PUBLISH_PATH) {
    return { page: PUBLISH_PATH, links: PUBLISH_SECTION_LINKS };
  }
  return { page: '/', links: HOME_SECTION_LINKS };
}
