import { changeLocale } from '@/i18n/i18n';
import { listingFormSchema, toListingFormValues, toListingWrite } from './listing-form.schemas';

const VALID = {
  ...toListingFormValues(null),
  transaction: 'sale' as const,
  title: '  Apartament 3 camere  ',
  city: 'Timișoara',
  street_label: 'Str. Gheorghe Lazăr, 12',
  rooms: '3',
  area_m2: '90,5',
  price: '168.000',
  currency: 'EUR' as const,
  floor: '2',
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
      floor: 2,
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

  it('refuses a floor above the number of floors in the building', () => {
    const result = listingFormSchema.safeParse({ ...VALID, floor: '5', building_floors: '4' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['floor']);
    expect(
      listingFormSchema.safeParse({ ...VALID, floor: '4', building_floors: '4' }).success,
    ).toBe(true);
  });

  it('shows stored numbers in a form the Romanian parser reads back', () => {
    const values = toListingFormValues({ ...toListingWrite(VALID), transaction: 'sale' });
    expect(values.area_m2).toBe('90,5');
    expect(values.floor).toBe('2');
    expect(toListingWrite(values).price).toBe(168000);
  });

  it('asks an apartment for its floor and a house for its type and land area', () => {
    const apartment = listingFormSchema.safeParse({ ...VALID, floor: '' });
    expect(apartment.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['floor']);

    const house = listingFormSchema.safeParse({ ...VALID, property_type: 'house', floor: '' });
    expect(house.error?.issues.map((issue) => issue.path.join('.'))).toEqual(
      expect.arrayContaining(['house_type', 'land_area_m2']),
    );
    expect(
      listingFormSchema.safeParse({
        ...VALID,
        property_type: 'house',
        floor: '',
        house_type: 'duplex',
        land_area_m2: '300',
      }).success,
    ).toBe(true);
  });

  it('keeps only the details that belong to the chosen property type and transaction', () => {
    const write = toListingWrite({
      ...VALID,
      property_type: 'house',
      house_type: 'detached',
      land_area_m2: '420,5',
      partitioning: 'detached',
      comfort: 'first',
      has_elevator: true,
      has_attic: true,
      heating: 'building_boiler',
      pets: 'allowed',
      utilities: ['water', 'internet'],
    });
    expect(write).toMatchObject({
      property_type: 'house',
      floor: null,
      house_type: 'detached',
      land_area_m2: 420.5,
      partitioning: null,
      comfort: null,
      has_elevator: false,
      has_attic: true,
      heating: null,
      pets: null,
      utilities: ['water', 'internet'],
    });

    const apartment = toListingWrite({
      ...VALID,
      house_type: 'duplex',
      has_attic: true,
      utilities: ['water', 'internet'],
      heating: 'solar_panels',
    });
    expect(apartment).toMatchObject({
      house_type: null,
      has_attic: false,
      utilities: ['water'],
      heating: null,
    });
  });
});
