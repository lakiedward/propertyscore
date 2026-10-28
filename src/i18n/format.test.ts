import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatPrice,
  formatRelative,
  parseLocaleNumber,
} from './format';
import { changeLocale } from './i18n';

const ANY_SPACE = /\s/g;

function plain(value: string): string {
  return value.replace(ANY_SPACE, ' ');
}

describe('format', () => {
  describe('in Romanian', () => {
    beforeEach(async () => {
      await changeLocale('ro');
    });

    it('formats numbers with a dot for thousands and a comma for decimals', () => {
      expect(formatNumber(1250.5, { minimumFractionDigits: 2 })).toBe('1.250,50');
    });

    it('formats money in the currency of the record', () => {
      expect(plain(formatCurrency(1250.5, 'EUR'))).toBe('1.250,50 EUR');
      expect(plain(formatCurrency(1250.5, 'RON'))).toBe('1.250,50 RON');
    });

    it('formats prices as whole amounts with the local currency symbol', () => {
      expect(plain(formatPrice(125000, 'EUR'))).toBe('125.000 €');
      expect(plain(formatPrice(500, 'RON'))).toBe('500 lei');
    });

    it('formats percentages', () => {
      expect(plain(formatPercent(0.85))).toBe('85 %');
    });

    it('formats dates day first', () => {
      expect(
        formatDate('2026-03-05T10:00:00Z', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      ).toBe('05.03.2026');
    });

    it('formats dates with the time in 24-hour style', () => {
      expect(plain(formatDateTime(new Date(2026, 2, 5, 14, 30)))).toBe('5 mar. 2026, 14:30');
    });

    it('formats relative times', () => {
      const now = new Date('2026-10-12T12:00:00Z');
      expect(formatRelative(new Date('2026-10-11T12:00:00Z'), now)).toBe('ieri');
    });

    it('parses numbers typed with Romanian separators', () => {
      expect(parseLocaleNumber('1.250,50')).toBe(1250.5);
      expect(parseLocaleNumber(' 42 ')).toBe(42);
      expect(parseLocaleNumber('12a')).toBeUndefined();
      expect(parseLocaleNumber('')).toBeUndefined();
    });
  });

  describe('in English', () => {
    beforeEach(async () => {
      await changeLocale('en');
    });

    it('formats prices as whole amounts with the currency symbol', () => {
      expect(plain(formatPrice(125000, 'EUR'))).toBe('€125,000');
      expect(plain(formatPrice(500, 'RON'))).toBe('RON 500');
    });

    it('formats numbers with a comma for thousands and a dot for decimals', () => {
      expect(formatNumber(1250.5, { minimumFractionDigits: 2 })).toBe('1,250.50');
    });

    it('keeps the currency of the record', () => {
      expect(formatCurrency(1250.5, 'EUR')).toBe('€1,250.50');
    });

    it('formats dates day first, British style', () => {
      expect(
        formatDate('2026-03-05T10:00:00Z', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      ).toBe('05/03/2026');
    });

    it('formats dates with the time in 24-hour style', () => {
      expect(plain(formatDateTime(new Date(2026, 2, 5, 14, 30)))).toBe('5 Mar 2026, 14:30');
    });

    it('parses numbers typed with English separators', () => {
      expect(parseLocaleNumber('1,250.50')).toBe(1250.5);
    });
  });
});
