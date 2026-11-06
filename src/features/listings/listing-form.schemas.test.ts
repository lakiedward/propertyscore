import { changeLocale } from '@/i18n/i18n';
import { listingFormSchema, toListingFormValues, toListingWrite } from './listing-form.schemas';

const VALID = {
  transaction: 'sale' as const,
  title: '  Apartament 3 camere  ',
  city: 'Timișoara',
  street_label: 'Str. Gheorghe Lazăr, 12',
  rooms: '3',
  area_m2: '90,5',
  price: '168.000',
  currency: 'EUR' as const,
  floor: '',
  building_floors: '4',
  year_built: '1985',
  description: '',
  pin: [21.2394, 45.7469] as [number, number],
};

describe('listingFormSchema', () => {
  beforeEach(async () => {
    await changeLocale('ro');
  });

  it('turns Romanian numbers and empty optional fields into the listing payload', () => {
    expect(listingFormSchema.safeParse(VALID).success).toBe(true);
    expect(toListingWrite(VALID)).toMatchObject({
      title: 'Apartament 3 camere',
      rooms: 3,
      area_m2: 90.5,
      price: 168000,
      floor: null,
      building_floors: 4,
      year_built: 1985,
      description: null,
      longitude: 21.2394,
      latitude: 45.7469,
    });
  });

  it('refuses a listing without a place on the map or with rooms out of range', () => {
    const result = listingFormSchema.safeParse({ ...VALID, pin: null, rooms: '0' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(
      expect.arrayContaining(['pin', 'rooms']),
    );
  });

  it('shows stored numbers in a form the Romanian parser reads back', () => {
    const values = toListingFormValues({
      ...toListingWrite(VALID),
      transaction: 'sale',
      currency: 'EUR',
      floor: null,
      building_floors: 4,
      year_built: 1985,
      description: null,
      latitude: 45.7469,
      longitude: 21.2394,
    });
    expect(values.area_m2).toBe('90,5');
    expect(toListingWrite(values).price).toBe(168000);
  });
});
