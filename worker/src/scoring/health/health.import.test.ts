import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  cnasListEntries,
  emergencyRow,
  extractCnasProviders,
  findTableColumns,
  groupCnasLists,
  normalizePlace,
  placeEmergencyRows,
  readProviderTable,
} from './health.import.ts';

const PIVOT_FIXTURE = fileURLToPath(new URL('./fixtures/cas-pivot.xlsx', import.meta.url));

function hasUnzip(): boolean {
  return spawnSync('unzip', ['-v'], { stdio: 'ignore' }).error === undefined;
}

const COUNTY_LIST = [
  ['Casa de Asigurări de Sănătate Timiș'],
  ['Lista farmaciilor aflate în relație contractuală', '', '', ''],
  ['Nr. crt.', 'Denumire furnizor', 'Localitate', 'Adresa punct de lucru', 'Telefon / adresa'],
  ['1', 'Farmacia Catena SRL', 'Timișoara', 'Str. Mărășești nr. 5', '0256 000 000'],
  ['2', 'Farmacia Catena SRL', 'Timișoara', 'Str. Mărășești nr. 5', '0256 000 000'],
  ['3', 'Farmacia Dona', 'Lugoj', 'Str. Bălcescu nr. 1', ''],
  ['4', 'Farmacia Sensiblu', 'Mun. Timisoara', 'Bd. Republicii nr. 9', ''],
  ['5', '', '', '', ''],
];

describe('findTableColumns', () => {
  it('finds the header row and prefers the provider name over the doctor', () => {
    expect(findTableColumns(COUNTY_LIST)).toEqual({
      headerIndex: 2,
      name: 1,
      address: 3,
      number: null,
      locality: 2,
    });
    expect(
      findTableColumns([['Nume si prenume medic', 'Denumire cabinet', 'Adresa sediu', 'E-mail']]),
    ).toMatchObject({ name: 1, address: 2, locality: null });
  });

  it('joins a street column with its number column', () => {
    const columns = findTableColumns([
      ['Denumire', 'Strada', 'Nr'],
      ['CMI Dr. Pop', 'Str. Lalelelor', '7A'],
    ]);
    expect(columns).toMatchObject({ address: 1, number: 2 });
    if (columns === null) throw new Error('columns not found');
    expect(
      extractCnasProviders(
        [
          ['Denumire', 'Strada', 'Nr'],
          ['CMI Dr. Pop', 'Str. Lalelelor', '7A'],
        ],
        columns,
        'București',
      ).rows,
    ).toEqual([{ name: 'CMI Dr. Pop', address: 'Str. Lalelelor nr. 7A' }]);
  });

  it('gives up on a table without a provider and a place column', () => {
    expect(
      findTableColumns([
        ['Cod', 'Valoare'],
        ['1', '2'],
      ]),
    ).toBeNull();
  });
});

describe('extractCnasProviders', () => {
  it('keeps the city rows of a county list once each', () => {
    const columns = findTableColumns(COUNTY_LIST);
    if (columns === null) throw new Error('columns not found');
    expect(extractCnasProviders(COUNTY_LIST, columns, 'Timișoara')).toEqual({
      rows: [
        { name: 'Farmacia Catena SRL', address: 'Str. Mărășești nr. 5' },
        { name: 'Farmacia Sensiblu', address: 'Bd. Republicii nr. 9' },
      ],
      skippedOutsideCity: 1,
      skippedDuplicate: 1,
      localityFilter: 'column',
    });
  });

  it('filters by the address when there is no locality column, and keeps a single-city list', () => {
    const county = [
      ['Denumire', 'Adresa'],
      ['Farmacia A', 'Târgu Mureș, Str. Gheorghe Doja nr. 2'],
      ['Farmacia B', 'Loc. Reghin, Str. Pandurilor nr. 3'],
      ['Farmacia C', 'Tg. Mures, Bd. 1 Decembrie 1918 nr. 10'],
    ];
    const columns = findTableColumns(county);
    if (columns === null) throw new Error('columns not found');
    const extraction = extractCnasProviders(county, columns, 'Târgu Mureș');
    expect(extraction.localityFilter).toBe('address');
    expect(extraction.rows.map((row) => row.name)).toEqual(['Farmacia A', 'Farmacia C']);

    const city = [
      ['Denumire', 'Adresa'],
      ['Farmacia D', 'Calea Victoriei nr. 12, Sector 1'],
    ];
    const cityColumns = findTableColumns(city);
    if (cityColumns === null) throw new Error('columns not found');
    expect(extractCnasProviders(city, cityColumns, 'București')).toMatchObject({
      localityFilter: 'none',
      rows: [{ name: 'Farmacia D' }],
    });
  });
});

describe('normalizePlace', () => {
  it('reads the usual spellings of a city as one name', () => {
    expect(normalizePlace('Mun. Târgu-Mureș')).toBe('targu mures');
    expect(normalizePlace('Tg. Mures')).toBe('targu mures');
    expect(normalizePlace('Municipiul Cluj-Napoca')).toBe('cluj napoca');
  });
});

describe('cnasListEntries', () => {
  it('maps the file kinds and skips rows without a file, kind or date', () => {
    const blank = { url_pagina: '', observatii: '' };
    expect(
      cnasListEntries([
        {
          ...blank,
          fisier: 'farmacii-2026-10-01.xlsx',
          tip: 'farmacii',
          data_listei: '2026-10-01',
          url_fisier: 'https://cas.example/f.xlsx',
        },
        {
          ...blank,
          fisier: 'medici-familie-2026-09-30.csv',
          tip: 'medici-familie',
          data_listei: '2026-09-30',
          url_fisier: '',
        },
        { ...blank, fisier: '', tip: 'spitale', data_listei: '2026-10-01', url_fisier: '' },
        {
          ...blank,
          fisier: 'x.xlsx',
          tip: 'laboratoare',
          data_listei: '2026-10-01',
          url_fisier: '',
        },
        { ...blank, fisier: 'y.xlsx', tip: 'dentist', data_listei: '1 oct 2026', url_fisier: '' },
      ]),
    ).toEqual({
      entries: [
        {
          file: 'farmacii-2026-10-01.xlsx',
          kind: 'pharmacy',
          listDate: '2026-10-01',
          sourceRef: 'https://cas.example/f.xlsx',
        },
        {
          file: 'medici-familie-2026-09-30.csv',
          kind: 'family_doctor',
          listDate: '2026-09-30',
          sourceRef: 'medici-familie-2026-09-30.csv',
        },
      ],
      skipped: 3,
    });
  });
});

describe('emergencyRow', () => {
  const base = {
    oras: 'timisoara',
    nume: 'Spitalul Clinic Județean de Urgență  Pius Brânzeu',
    nivel: 'UPU',
    pediatric: 'nu',
    adresa: 'Bd. Liviu Rebreanu nr. 156',
    lat: '45,7378',
    lon: '21.2422',
    sursa_act: 'OMS 1706/2007',
    sursa_url: 'https://legislatie.just.ro/x',
  };

  it('reads the level, the pediatric flag and comma decimals', () => {
    expect(emergencyRow(base)).toEqual({
      citySlug: 'timisoara',
      name: 'Spitalul Clinic Județean de Urgență Pius Brânzeu',
      level: 'upu',
      isPediatric: false,
      address: 'Bd. Liviu Rebreanu nr. 156',
      location: { lng: 21.2422, lat: 45.7378 },
      sourceRef: 'OMS 1706/2007 · https://legislatie.just.ro/x',
    });
    expect(emergencyRow({ ...base, pediatric: 'Da', lat: '', lon: '' })).toMatchObject({
      isPediatric: true,
      location: null,
    });
  });

  it('refuses rows without a level, a name or a source, and coordinates outside Romania', () => {
    expect(emergencyRow({ ...base, nivel: 'spital' })).toBeNull();
    expect(emergencyRow({ ...base, nume: ' ' })).toBeNull();
    expect(emergencyRow({ ...base, sursa_act: '', sursa_url: '' })).toBeNull();
    expect(emergencyRow({ ...base, lat: '91' })?.location).toBeNull();
  });
});

describe('groupCnasLists', () => {
  it('reads the files of one kind and date as one list, deduplicated across files', () => {
    const groups = groupCnasLists([
      {
        file: 'ambulatoriu-clinic.xlsx',
        kind: 'specialist_outpatient',
        listDate: '2026-10-01',
        sourceRef: 'a.xlsx',
      },
      { file: 'farmacii.xlsx', kind: 'pharmacy', listDate: '2026-10-01', sourceRef: 'f.xlsx' },
      {
        file: 'ambulatoriu-paraclinic.xlsx',
        kind: 'specialist_outpatient',
        listDate: '2026-10-01',
        sourceRef: 'p.xlsx',
      },
    ]);
    expect(groups).toEqual([
      {
        kind: 'specialist_outpatient',
        listDate: '2026-10-01',
        files: ['ambulatoriu-clinic.xlsx', 'ambulatoriu-paraclinic.xlsx'],
        sourceRef: 'a.xlsx | p.xlsx',
      },
      { kind: 'pharmacy', listDate: '2026-10-01', files: ['farmacii.xlsx'], sourceRef: 'f.xlsx' },
    ]);

    const clinic = [
      ['Denumire', 'Adresa'],
      ['Clinica Unu', 'Str. A nr. 1'],
      ['Lab Doi', 'Str. B nr. 2'],
    ];
    const lab = [
      ['Denumire', 'Adresa'],
      ['Lab Doi', 'Str. B nr. 2'],
      ['Lab Trei', 'Str. C nr. 3'],
    ];
    const seen = new Set<string>();
    const rows = [clinic, lab].flatMap((table) => {
      const columns = findTableColumns(table);
      if (columns === null) throw new Error('columns not found');
      return extractCnasProviders(table, columns, 'București', seen).rows.map((row) => row.name);
    });
    expect(rows).toEqual(['Clinica Unu', 'Lab Doi', 'Lab Trei']);
  });
});

describe('extractCnasProviders for one city', () => {
  it('reads the sectors of a Bucharest locality column as the city', () => {
    const list = [
      ['Denumire furnizor', 'Localitate', 'Adresa'],
      ['Farmacia Unu', 'București Sector 3', 'Str. Matei Basarab nr. 1'],
      ['Farmacia Doi', 'Sector 6', 'Bd. Iuliu Maniu nr. 2'],
      ['Farmacia Trei', 'Voluntari', 'Str. Erou Iancu Nicolae nr. 3'],
    ];
    const columns = findTableColumns(list);
    if (columns === null) throw new Error('columns not found');
    expect(extractCnasProviders(list, columns, 'București').rows.map((row) => row.name)).toEqual([
      'Farmacia Unu',
      'Farmacia Doi',
    ]);
  });

  it('keeps only the rows whose address names the city when there is no locality column', () => {
    const list = [
      ['Denumire', 'Adresa'],
      ['Farmacia A', 'Str. Avram Iancu nr. 1, Cluj-Napoca'],
      ['Farmacia B', 'Str. Horea nr. 2'],
    ];
    const columns = findTableColumns(list);
    if (columns === null) throw new Error('columns not found');
    expect(extractCnasProviders(list, columns, 'Cluj-Napoca')).toMatchObject({
      localityFilter: 'address',
      rows: [{ name: 'Farmacia A' }],
    });
  });
});

describe('placeEmergencyRows', () => {
  it('geocodes rows without coordinates and names the ones it cannot place', async () => {
    const row = {
      citySlug: 'sibiu',
      level: 'upu' as const,
      isPediatric: false,
      sourceRef: 'OMS',
    };
    const result = await placeEmergencyRows(
      [
        { ...row, name: 'Cu coordonate', address: null, location: { lng: 24.1, lat: 45.8 } },
        { ...row, name: 'Geocodat', address: 'Bd. Corneliu Coposu nr. 2', location: null },
        { ...row, name: 'Negăsit', address: 'Strada Inexistentă nr. 9', location: null },
      ],
      (address) => Promise.resolve(address.startsWith('Bd.') ? { lng: 24.15, lat: 45.79 } : null),
    );
    expect(result.placed.map((placed) => [placed.name, placed.location])).toEqual([
      ['Cu coordonate', { lng: 24.1, lat: 45.8 }],
      ['Geocodat', { lng: 24.15, lat: 45.79 }],
    ]);
    expect(result.unplaced).toEqual(['Negăsit']);
  });
});

describe('extractCnasProviders on county lists', () => {
  it('reads an empty locality cell from the address and ignores the county name', () => {
    const list = [
      ['Denumire furnizor', 'Localitate', 'Adresa'],
      ['Farmacia Unu', '', 'Iași, Str. Lăpușneanu nr. 1'],
      ['Farmacia Doi', '', 'Pașcani, Str. Gării nr. 2, jud. Iași'],
      ['Farmacia Trei', 'Iași', 'Bd. Independenței nr. 3'],
    ];
    const columns = findTableColumns(list);
    if (columns === null) throw new Error('columns not found');
    expect(extractCnasProviders(list, columns, 'Iași').rows.map((row) => row.name)).toEqual([
      'Farmacia Unu',
      'Farmacia Trei',
    ]);
  });

  it('gives a work point without a name the provider of the row above', () => {
    const list = [
      ['Denumire', 'Adresa'],
      ['Farmacia Unu', 'Sibiu, Str. Mare nr. 1'],
      ['', 'Sibiu, Str. Mică nr. 2'],
      ['Farmacia Doi', 'Cisnădie, Str. Nouă nr. 3'],
    ];
    const columns = findTableColumns(list);
    if (columns === null) throw new Error('columns not found');
    expect(extractCnasProviders(list, columns, 'Sibiu').rows).toEqual([
      { name: 'Farmacia Unu', address: 'Sibiu, Str. Mare nr. 1' },
      { name: 'Farmacia Unu', address: 'Sibiu, Str. Mică nr. 2' },
    ]);
  });
});

describe('extractCnasProviders on sections', () => {
  it('switches to the columns of each section header', () => {
    const list = [
      ['Nr. crt.', 'Denumire furnizor - Laboratoare', 'Adresa', 'Telefon'],
      ['1', 'Lab Unu', 'Iași, Str. Păcurari nr. 1', '0232 000 001'],
      ['Nr. crt.', 'Denumire furnizor - Radiologie', 'RMN / CT', 'Adresa'],
      ['2', 'Imagistica Doi', 'RMN, CT', 'Iași, Bd. Carol I nr. 2'],
      ['3', 'Imagistica Trei', 'CT', 'Pașcani, Str. Gării nr. 3'],
    ];
    const columns = findTableColumns(list);
    if (columns === null) throw new Error('columns not found');
    expect(extractCnasProviders(list, columns, 'Iași').rows).toEqual([
      { name: 'Lab Unu', address: 'Iași, Str. Păcurari nr. 1' },
      { name: 'Imagistica Doi', address: 'Iași, Bd. Carol I nr. 2' },
    ]);
  });
});

describe.skipIf(!hasUnzip())('readProviderTable', () => {
  it('reads the first sheet with a provider table', async () => {
    const table = await readProviderTable(PIVOT_FIXTURE);
    expect(table?.rows).toEqual([
      ['Denumire furnizor', 'Adresa'],
      ['Farmacia Ana, Sibiu', 'Sibiu, Str. Mică nr. 2'],
    ]);
  });
});
