import type { ListingFormValues } from './listing-form.schemas';

export const WIZARD_STEPS = ['type', 'text', 'details', 'address', 'photos', 'contact'] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

export const DRAFT_STEP_COUNT = 4;

export const STEP_FIELDS = {
  type: ['transaction'],
  text: ['title', 'description'],
  details: ['price', 'currency', 'area_m2', 'rooms', 'floor', 'building_floors', 'year_built'],
  address: ['city', 'street_label', 'pin'],
  photos: [],
  contact: [],
} as const satisfies Record<WizardStep, readonly (keyof ListingFormValues)[]>;

export function stepAt(position: number): WizardStep {
  return WIZARD_STEPS[Math.min(Math.max(position, 1), WIZARD_STEPS.length) - 1] ?? 'type';
}

export function firstStepWithError(fields: readonly string[]): number {
  const index = WIZARD_STEPS.findIndex((step) =>
    STEP_FIELDS[step].some((field: string) => fields.includes(field)),
  );
  return index === -1 ? 1 : index + 1;
}
