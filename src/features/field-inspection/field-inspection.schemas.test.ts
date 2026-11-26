import { ownerConfirmSchema } from './field-inspection.schemas';

describe('ownerConfirmSchema', () => {
  it('trims the owner name', () => {
    expect(ownerConfirmSchema.parse({ ownerName: '  D. Popescu ' })).toEqual({
      ownerName: 'D. Popescu',
    });
  });

  it('requires a name that is not only spaces and caps it at 120 characters', () => {
    expect(ownerConfirmSchema.safeParse({ ownerName: '   ' }).success).toBe(false);
    expect(ownerConfirmSchema.safeParse({ ownerName: 'a'.repeat(121) }).success).toBe(false);
    expect(ownerConfirmSchema.safeParse({ ownerName: 'a'.repeat(120) }).success).toBe(true);
  });
});
