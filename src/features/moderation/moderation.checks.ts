export const REVIEW_CHECKS = ['photos', 'personalData', 'price', 'description'] as const;

export type ReviewCheck = (typeof REVIEW_CHECKS)[number];

export type ReviewChecks = Record<ReviewCheck, boolean>;

export const UNCHECKED_REVIEW: ReviewChecks = {
  photos: false,
  personalData: false,
  price: false,
  description: false,
};
