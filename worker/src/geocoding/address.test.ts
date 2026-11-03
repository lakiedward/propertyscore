import { describe, expect, it } from 'vitest';

import { houseNumberKeys, parseAddress, placeWordSet, streetKey } from './address.ts';

describe('streetKey', () => {
  it('drops the street type and spells out the titles', () => {
    expect(streetKey('Bulevardul General Ion Dragalina')).toBe('general ion dragalina');
    expect(streetKey('B-dul Gen. Ion Dragalina')).toBe('general ion dragalina');
    expect(streetKey('Str. Dr. Ion Rațiu')).toBe('doctor ion ratiu');
    expect(streetKey('Calea Șagului')).toBe('sagului');
  });
});

describe('houseNumberKeys', () => {
  it('keeps the number with its letter and both ends of a range', () => {
    expect(houseNumberKeys('12A')).toEqual(['12a']);
    expect(houseNumberKeys('12-14')).toEqual(['12-14', '12', '14']);
    expect(houseNumberKeys('3;5')).toEqual(['3', '5']);
    expect(houseNumberKeys('fn')).toEqual([]);
  });
});

describe('parseAddress', () => {
  it('reads a SIIIR address: street, number, locality', () => {
    expect(parseAddress('Gladiolelor 2, SIBIU')).toEqual({
      streetKey: 'gladiolelor',
      houseNumber: '2',
    });
  });

  it('reads a CNAS address with markers and flat details', () => {
    expect(parseAddress('Str. Mihai Viteazu nr. 12 bis, bl. A2, sc. B, ap. 3, Timișoara')).toEqual({
      streetKey: 'mihai viteazu',
      houseNumber: '12',
    });
    expect(parseAddress('Timișoara, B-dul Revoluției din 1989 nr.5A')).toEqual({
      streetKey: 'revolutiei din 1989',
      houseNumber: '5a',
    });
    expect(parseAddress('Calea Aradului 14 B, Timișoara')).toEqual({
      streetKey: 'aradului',
      houseNumber: '14b',
    });
  });

  it('keeps a street without a number and rejects a locality alone', () => {
    expect(parseAddress('Aleea Viilor, Sibiu')).toEqual({ streetKey: 'viilor', houseNumber: null });
    expect(parseAddress('SIBIU', placeWordSet('Sibiu'))).toBeNull();
    expect(parseAddress('')).toBeNull();
  });
});
