import type { ListingFormValues } from './listing-form.schemas';

export const EDITOR_SECTIONS = [
  'details',
  'photos',
  'address',
  'text',
  'extras',
  'contact',
] as const;

export type EditorSection = (typeof EDITOR_SECTIONS)[number];

export const SECTION_FIELDS = {
  details: [
    'price',
    'currency',
    'area_m2',
    'rooms',
    'bathrooms',
    'comfort',
    'land_area_m2',
    'partitioning',
    'floor',
    'building_type',
    'house_type',
    'building_floors',
    'year_built',
    'has_basement',
    'has_semibasement',
    'has_attic',
  ],
  photos: [],
  address: ['city', 'street_label', 'pin'],
  text: ['title', 'description'],
  extras: [
    'interior_condition',
    'heating',
    'cooling',
    'furnishing',
    'pets',
    'pool',
    'yard',
    'balconies',
    'parking_spaces',
    'utilities',
    'building_services',
    'has_elevator',
    'has_shared_yard',
    'is_passive_house',
  ],
  contact: [],
} as const satisfies Record<EditorSection, readonly (keyof ListingFormValues)[]>;

export const REQUIRED_SECTIONS: readonly EditorSection[] = ['details', 'photos', 'address', 'text'];

export function isEditorSection(value: string): value is EditorSection {
  return EDITOR_SECTIONS.some((section) => section === value);
}

export function fieldsOf(sections: readonly EditorSection[]): (keyof ListingFormValues)[] {
  return sections.flatMap((section) => [...SECTION_FIELDS[section]]);
}

export function sectionsWithErrors(fields: readonly string[]): EditorSection[] {
  return EDITOR_SECTIONS.filter((section) =>
    SECTION_FIELDS[section].some((field: string) => fields.includes(field)),
  );
}
