import { isPhoneNumber, toE164Phone } from './phone';

describe('phone', () => {
  describe('toE164Phone', () => {
    it('turns a Romanian national number into E.164', () => {
      expect(toE164Phone('0722 123 456')).toBe('+40722123456');
      expect(toE164Phone('(021) 315.15.15')).toBe('+40213151515');
    });

    it('keeps an international number and replaces a leading 00 with +', () => {
      expect(toE164Phone('+40 722-123-456')).toBe('+40722123456');
      expect(toE164Phone('0044 20 7946 0958')).toBe('+442079460958');
    });
  });

  describe('isPhoneNumber', () => {
    it('accepts Romanian and international numbers', () => {
      expect(isPhoneNumber('0722 123 456')).toBe(true);
      expect(isPhoneNumber('+40 722 123 456')).toBe(true);
      expect(isPhoneNumber('+44 20 7946 0958')).toBe(true);
    });

    it('rejects short, long and non-numeric input', () => {
      expect(isPhoneNumber('0722 123')).toBe(false);
      expect(isPhoneNumber('+40 722 123 4567')).toBe(false);
      expect(isPhoneNumber('+123')).toBe(false);
      expect(isPhoneNumber('telefon')).toBe(false);
    });
  });
});
