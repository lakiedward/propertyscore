import { firstNameOf, initialsOf } from './profile.utils';

describe('profile.utils', () => {
  describe('initialsOf', () => {
    it('takes the first letters of the first and last name', () => {
      expect(initialsOf('Andreea Popescu')).toBe('AP');
      expect(initialsOf('  Ion  Vasile  Țurcanu ')).toBe('IȚ');
    });

    it('uses one letter for a single word', () => {
      expect(initialsOf('ana.ro@example.test')).toBe('A');
    });

    it('returns nothing for an empty name', () => {
      expect(initialsOf('   ')).toBe('');
    });
  });

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
