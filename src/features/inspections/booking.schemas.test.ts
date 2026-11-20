import {
  accessFormSchema,
  homeFormSchema,
  toBookingAccess,
  toBookingHome,
  type HomeFormValues,
} from './booking.schemas';

const HOME: HomeFormValues = {
  addressText: 'Str. Școlii 12',
  cityId: 'c1',
  pin: { lng: 21.22, lat: 45.75 },
  propertyType: 'apartment',
  areaM2: '76,5',
  yearBuilt: '1978',
  floor: '3',
  buildingFloors: '8',
};

function issuesOf(values: HomeFormValues) {
  const result = homeFormSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('booking.schemas', () => {
  it('accepts a complete apartment and converts it', () => {
    expect(issuesOf(HOME)).toEqual([]);
    expect(toBookingHome(HOME)).toEqual({
      addressText: 'Str. Școlii 12',
      cityId: 'c1',
      latitude: 45.75,
      longitude: 21.22,
      propertyType: 'apartment',
      areaM2: 76.5,
      yearBuilt: 1978,
      floor: 3,
      buildingFloors: 8,
    });
  });

  it('requires the pin and an area in range', () => {
    expect(issuesOf({ ...HOME, pin: null, areaM2: '5' })).toEqual(['pin', 'areaM2']);
  });

  it('refuses a floor above the building and ignores floors for a house', () => {
    expect(issuesOf({ ...HOME, floor: '9' })).toEqual(['floor']);
    expect(issuesOf({ ...HOME, propertyType: 'house', floor: '', buildingFloors: '' })).toEqual([]);
    expect(toBookingHome({ ...HOME, propertyType: 'house' })?.floor).toBeNull();
  });

  it('needs a name and a valid phone only when someone else opens', () => {
    const access = { mode: 'other', name: '', phone: '123', tags: [], notes: '' } as const;
    expect(accessFormSchema.safeParse(access).success).toBe(false);
    expect(accessFormSchema.safeParse({ ...access, mode: 'self' }).success).toBe(true);
    expect(
      toBookingAccess({ ...access, name: 'Maria', phone: '0722 123 456', tags: ['pet'] }),
    ).toEqual({ mode: 'other', name: 'Maria', phone: '+40722123456', tags: ['pet'], notes: null });
  });
});
