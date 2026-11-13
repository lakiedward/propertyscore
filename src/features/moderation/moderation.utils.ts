export type DayBucket = 'today' | 'yesterday' | 'date';

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

const DAY_MS = 86_400_000;

export function dayBucket(value: Date | string, now: Date = new Date()): DayBucket {
  const date = value instanceof Date ? value : new Date(value);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (days === 0) {
    return 'today';
  }
  if (days === 1) {
    return 'yesterday';
  }
  return 'date';
}

export function pricePerSquareMeter(price: number, areaM2: number): number | null {
  return areaM2 > 0 ? Math.round(price / areaM2) : null;
}

export function decisionMessage(messages: readonly string[]): string {
  return messages.join(' ');
}

type ComparedColumn =
  | 'property_type'
  | 'transaction'
  | 'title'
  | 'description'
  | 'price'
  | 'currency'
  | 'area_m2'
  | 'rooms'
  | 'floor'
  | 'building_floors'
  | 'year_built'
  | 'city'
  | 'street_label'
  | 'latitude'
  | 'longitude'
  | 'bathrooms'
  | 'partitioning'
  | 'comfort'
  | 'building_type'
  | 'house_type'
  | 'land_area_m2'
  | 'has_basement'
  | 'has_semibasement'
  | 'has_attic'
  | 'interior_condition'
  | 'heating'
  | 'cooling'
  | 'furnishing'
  | 'pets'
  | 'is_passive_house'
  | 'balconies'
  | 'parking_spaces'
  | 'utilities'
  | 'building_services'
  | 'has_elevator'
  | 'has_shared_yard'
  | 'pool'
  | 'yard';

export type ListingChange =
  | 'propertyType'
  | 'transaction'
  | 'title'
  | 'description'
  | 'price'
  | 'area'
  | 'rooms'
  | 'floor'
  | 'yearBuilt'
  | 'address'
  | 'details'
  | 'extras'
  | 'photos';

const CHANGE_GROUPS: readonly { change: ListingChange; columns: readonly ComparedColumn[] }[] = [
  { change: 'propertyType', columns: ['property_type'] },
  { change: 'transaction', columns: ['transaction'] },
  { change: 'title', columns: ['title'] },
  { change: 'description', columns: ['description'] },
  { change: 'price', columns: ['price', 'currency'] },
  { change: 'area', columns: ['area_m2'] },
  { change: 'rooms', columns: ['rooms'] },
  { change: 'floor', columns: ['floor', 'building_floors'] },
  { change: 'yearBuilt', columns: ['year_built'] },
  { change: 'address', columns: ['city', 'street_label', 'latitude', 'longitude'] },
  {
    change: 'details',
    columns: [
      'bathrooms',
      'partitioning',
      'comfort',
      'building_type',
      'house_type',
      'land_area_m2',
      'has_basement',
      'has_semibasement',
      'has_attic',
    ],
  },
  {
    change: 'extras',
    columns: [
      'interior_condition',
      'heating',
      'cooling',
      'furnishing',
      'pets',
      'is_passive_house',
      'balconies',
      'parking_spaces',
      'utilities',
      'building_services',
      'has_elevator',
      'has_shared_yard',
      'pool',
      'yard',
    ],
  },
];

type ComparedListing = Record<ComparedColumn, unknown> & {
  photos: readonly { path: string }[];
};

function photoOrder(listing: ComparedListing): string {
  return listing.photos.map((photo) => photo.path).join('|');
}

export function listingChanges(
  revision: ComparedListing,
  original: ComparedListing,
): ListingChange[] {
  const changes = CHANGE_GROUPS.filter(({ columns }) =>
    columns.some((column) => JSON.stringify(revision[column]) !== JSON.stringify(original[column])),
  ).map(({ change }) => change);
  return photoOrder(revision) === photoOrder(original) ? changes : [...changes, 'photos'];
}
