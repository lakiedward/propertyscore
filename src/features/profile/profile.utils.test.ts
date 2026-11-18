import { initialsOf } from './profile.utils';

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
