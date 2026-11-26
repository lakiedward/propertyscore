import { firstNameOf } from './profile.utils';

describe('profile.utils', () => {
  describe('firstNameOf', () => {
    it('takes the first word of the name', () => {
      expect(firstNameOf('  Ion  Vasile  Țurcanu ')).toBe('Ion');
      expect(firstNameOf('Ana-Maria Popescu')).toBe('Ana-Maria');
    });

    it('keeps a single word as it is', () => {
      expect(firstNameOf('ana.ro@example.test')).toBe('ana.ro@example.test');
    });

    it('returns nothing for an empty name', () => {
      expect(firstNameOf('   ')).toBe('');
    });
  });
});
