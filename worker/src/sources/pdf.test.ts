import { describe, expect, it } from 'vitest';

import { layoutTableRows } from './pdf.ts';

describe('layoutTableRows', () => {
  it('joins the lines of each numbered row and repeats no page header', () => {
    const text = [
      'LISTA FURNIZORILOR',
      '',
      'Nr.   Denumire furnizor          Adresa',
      'crt.',
      '1     Farmacia Unu               Oradea, str. Mare',
      '      SRL                        nr. 1',
      '2     Catena                     Oradea, str. Mica nr. 2',
      '\fNr.   Denumire furnizor          Adresa',
      '3     Dona Plus SRL              Beius, str. Noua nr. 3',
    ].join('\n');
    expect(layoutTableRows(text)).toEqual([
      ['Nr. crt.', 'Denumire furnizor', 'Adresa'],
      ['1', 'Farmacia Unu SRL', 'Oradea, str. Mare nr. 1'],
      ['2', 'Catena', 'Oradea, str. Mica nr. 2'],
      ['3', 'Dona Plus SRL', 'Beius, str. Noua nr. 3'],
    ]);
  });

  it('gives a column without a header to the next column, and centres continuation lines', () => {
    const text = [
      'Nr   Denumire furnizor                    Adresa',
      '     CABINET MEDICAL',
      '1    DR. POP                Cluj-Napoca   Str. Horea nr. 4',
      '     SRL',
      '     CABINET',
      '2    DR. ION                Gherla        Str. Unirii nr. 9',
      '     STOMATOLOGIC',
      '3    DR. RUS                Dej           Str. Viilor nr. 2',
    ].join('\n');
    expect(layoutTableRows(text)).toEqual([
      ['Nr', 'Denumire furnizor', 'Adresa'],
      ['1', 'CABINET MEDICAL DR. POP SRL', 'Cluj-Napoca Str. Horea nr. 4'],
      ['2', 'CABINET DR. ION', 'Gherla Str. Unirii nr. 9'],
      ['3', 'STOMATOLOGIC DR. RUS', 'Dej Str. Viilor nr. 2'],
    ]);
  });

  it('returns no rows without a header line', () => {
    expect(layoutTableRows('1  a\n2  b\n3  c')).toEqual([]);
  });
});
