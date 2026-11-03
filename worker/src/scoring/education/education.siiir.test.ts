import { describe, expect, it } from 'vitest';

import { WorkerError } from '../../lib/errors.ts';
import {
  classifySiiirUnit,
  convertSiiirRows,
  generatedOn,
  registerName,
  resolveUnit,
  type SiiirUnitKind,
} from './education.siiir.ts';
import type { UnitPlan } from './education.plan.ts';

function unitPlan(overrides: Partial<UnitPlan>): UnitPlan {
  return {
    regularLevels: [],
    otherLevels: [],
    teachingLanguages: [],
    hasPostSecondary: false,
    ...overrides,
  };
}

const SCHOOL = 'Unitate de învățământ';

const HEADER = [
  'An',
  'Cod SIIIR PJ',
  'Localitate unitate',
  'Cod SIRUTA unitate',
  'Cod SIIIR unitate',
  'Denumire lunga unitate',
  'Tip unitate',
  'Statut unitate',
  'Forma proprietate',
  'Strada',
  'Numar',
];

function unit(overrides: Partial<Record<string, string>>): string[] {
  const values: Record<string, string> = {
    An: '2025-2026',
    'Cod SIIIR PJ': '3261100001',
    'Localitate unitate': 'SIBIU',
    'Cod SIRUTA unitate': '143469',
    'Cod SIIIR unitate': '3261100001',
    'Denumire lunga unitate': 'ŞCOALA GIMNAZIALĂ NR. 2 SIBIU',
    'Tip unitate': SCHOOL,
    'Statut unitate': 'PJ',
    'Forma proprietate': 'Publică de interes naţional şi local',
    Strada: 'Gladiolelor',
    Numar: '2',
    ...overrides,
  };
  return HEADER.map((column) => values[column] ?? '');
}

function table(...units: string[][]): string[][] {
  return [['Generat la data: 08/10/2025 14:26'], HEADER, ...units];
}

const CITIES = { sibiu: [143469], bucuresti: [179141] };

describe('classifySiiirUnit', () => {
  it('reads the levels from the unit name', () => {
    expect(classifySiiirUnit(SCHOOL, 'CREȘA NR. 3')).toEqual({
      kind: 'scored',
      levels: ['nursery'],
    });
    expect(classifySiiirUnit(SCHOOL, 'Grădiniţa cu program prelungit nr. 5')).toEqual({
      kind: 'scored',
      levels: ['kindergarten'],
    });
    expect(classifySiiirUnit(SCHOOL, 'ȘCOALA PRIMARĂ "FRAM"').kind).toBe('scored');
    expect(classifySiiirUnit(SCHOOL, 'Şcoala Gimnazială nr. 1')).toEqual({
      kind: 'scored',
      levels: ['primary', 'lower_secondary'],
    });
    expect(classifySiiirUnit(SCHOOL, 'COLEGIUL NAȚIONAL "OCTAVIAN GOGA"')).toEqual({
      kind: 'scored',
      levels: ['upper_secondary'],
    });
    expect(classifySiiirUnit(SCHOOL, 'Școala Profesională nr. 1').kind).toBe('scored');
  });

  it('keeps special, post-secondary and military schools as excluded units', () => {
    expect(classifySiiirUnit(SCHOOL, 'Şcoala Gimnazială Specială nr. 3')).toMatchObject({
      kind: 'excluded',
      reason: 'special_education',
    });
    expect(
      classifySiiirUnit(SCHOOL, 'CENTRUL ȘCOLAR PENTRU EDUCAȚIE INCLUZIVĂ NR. 1'),
    ).toMatchObject({ kind: 'excluded', reason: 'special_education' });
    expect(classifySiiirUnit(SCHOOL, 'ŞCOALA POSTICEALĂ "HENRI COANDĂ"')).toMatchObject({
      kind: 'excluded',
      reason: 'post_secondary',
    });
    expect(classifySiiirUnit(SCHOOL, 'Școala Militară de Maiștri Militari')).toMatchObject({
      kind: 'excluded',
    });
    expect(classifySiiirUnit(SCHOOL, 'COLEGIUL NAȚIONAL MILITAR "MIHAI VITEAZUL"')).toMatchObject({
      kind: 'excluded',
    });
  });

  it('skips clubs, inspectorates and units of unknown level', () => {
    expect(classifySiiirUnit('Clubul copiilor', 'CLUBUL COPIILOR SIBIU')).toEqual({
      kind: 'skipped',
      reason: 'not_a_school',
    });
    expect(classifySiiirUnit(SCHOOL, 'ROYAL SCHOOL IN TRANSYLVANIA')).toEqual({
      kind: 'skipped',
      reason: 'unknown_level',
    });
    expect(
      classifySiiirUnit(
        'Serviciu de educație timpurie complementar (grădiniță comunitară)',
        'Grădinița comunitară Ferentari',
      ),
    ).toEqual({ kind: 'scored', levels: ['kindergarten'] });
  });
});

describe('registerName', () => {
  it('drops the locality at the end of the name', () => {
    expect(registerName('ŞCOALA GIMNAZIALĂ NR. 2 SIBIU', 'SIBIU')).toBe('ŞCOALA GIMNAZIALĂ NR. 2');
    expect(registerName('LICEUL TEHNOLOGIC SPECIAL "VASILE PAVELCU", IAȘI', 'IAŞI')).toBe(
      'LICEUL TEHNOLOGIC SPECIAL "VASILE PAVELCU"',
    );
    expect(registerName('ȘCOALA PROFESIONALĂ "SAMUS" CLUJ - NAPOCA', 'CLUJ-NAPOCA')).toBe(
      'ȘCOALA PROFESIONALĂ "SAMUS"',
    );
    expect(
      registerName('Școala Gimnazială nr. 5, Sector 1, București', 'BUCUREŞTI SECTORUL 1'),
    ).toBe('Școala Gimnazială nr. 5');
  });

  it('keeps a name that is only the locality and names without it', () => {
    expect(registerName('Grădinița "Albinuța"', 'BUCUREŞTI SECTORUL 2')).toBe(
      'Grădinița "Albinuța"',
    );
    expect(registerName('SIBIU', 'SIBIU')).toBe('SIBIU');
  });
});

describe('generatedOn', () => {
  it('reads the generation date of the export', () => {
    expect(generatedOn(table())).toBe('2025-10-08');
  });

  it('rejects an export without a generation date', () => {
    expect(() => generatedOn([HEADER])).toThrow(WorkerError);
  });
});

describe('resolveUnit', () => {
  it('takes the levels and languages of the schooling plan over the name', () => {
    expect(
      resolveUnit(
        { kind: 'scored', levels: ['upper_secondary'] },
        unitPlan({
          regularLevels: ['primary', 'lower_secondary', 'upper_secondary'],
          teachingLanguages: ['hu', 'ro'],
        }),
      ),
    ).toEqual({
      unit: { kind: 'scored', levels: ['primary', 'lower_secondary', 'upper_secondary'] },
      levelSource: 'plan',
      teachingLanguages: ['hu', 'ro'],
    });
  });

  it('scores a unit whose name gives no level when the plan has its classes', () => {
    expect(
      resolveUnit(
        { kind: 'skipped', reason: 'unknown_level' },
        unitPlan({ regularLevels: ['primary'] }),
      ).unit,
    ).toEqual({ kind: 'scored', levels: ['primary'] });
  });

  it('excludes a unit with only evening, special or post-secondary classes', () => {
    expect(
      resolveUnit(
        { kind: 'scored', levels: ['upper_secondary'] },
        unitPlan({ otherLevels: ['upper_secondary'] }),
      ).unit,
    ).toEqual({ kind: 'excluded', levels: ['upper_secondary'], reason: 'no_regular_classes' });
    expect(
      resolveUnit(
        { kind: 'scored', levels: ['upper_secondary'] },
        unitPlan({ hasPostSecondary: true }),
      ),
    ).toEqual({
      unit: { kind: 'excluded', levels: ['upper_secondary'], reason: 'post_secondary' },
      levelSource: 'name',
      teachingLanguages: null,
    });
  });

  it('keeps the name levels when the plan has no level it recognises', () => {
    expect(resolveUnit({ kind: 'scored', levels: ['primary'] }, unitPlan({}))).toEqual({
      unit: { kind: 'scored', levels: ['primary'] },
      levelSource: 'name',
      teachingLanguages: null,
    });
  });

  it('keeps name exclusions and units outside the plan as they are', () => {
    const special: SiiirUnitKind = {
      kind: 'excluded',
      levels: ['primary'],
      reason: 'special_education',
    };
    expect(
      resolveUnit(special, unitPlan({ regularLevels: ['primary', 'lower_secondary'] })).unit,
    ).toEqual({ ...special, levels: ['primary', 'lower_secondary'] });
    expect(resolveUnit({ kind: 'scored', levels: ['primary'] }, undefined)).toEqual({
      unit: { kind: 'scored', levels: ['primary'] },
      levelSource: 'name',
      teachingLanguages: null,
    });
    expect(
      resolveUnit(
        { kind: 'skipped', reason: 'not_a_school' },
        unitPlan({ regularLevels: ['primary'] }),
      ).unit.kind,
    ).toBe('skipped');
  });
});

describe('convertSiiirRows', () => {
  it('converts the units of the covered cities into register rows', () => {
    const result = convertSiiirRows(
      table(
        unit({}),
        unit({
          'Cod SIIIR unitate': '3261100002',
          'Denumire lunga unitate': 'GRĂDINIŢA CU PROGRAM NORMAL NR. 2 SIBIU',
          'Statut unitate': 'AR',
          Strada: '',
          Numar: '',
        }),
        unit({
          'Cod SIIIR PJ': '3261100003',
          'Cod SIIIR unitate': '3261100003',
          'Denumire lunga unitate': 'ŞCOALA POSTLICEALĂ SANITARĂ SIBIU',
          'Forma proprietate': 'Privată',
        }),
        unit({ 'Cod SIIIR unitate': '3261100004', 'Tip unitate': 'Clubul copiilor' }),
        unit({ 'Cod SIIIR unitate': '3261100001' }),
        unit({ 'Cod SIIIR unitate': '3261100009', 'Cod SIRUTA unitate': '143628' }),
      ),
      CITIES,
    );

    expect(result.sourceDate).toBe('2025-10-08');
    expect(result.skipped).toEqual({ not_a_school: 1, duplicate_code: 1 });
    expect(result.levelSources).toEqual({ plan: 0, name: 3 });
    expect(result.rows).toEqual([
      {
        siiir_code: '3261100001',
        parent_siiir_code: null,
        city_slug: 'sibiu',
        name: 'ŞCOALA GIMNAZIALĂ NR. 2',
        levels: ['primary', 'lower_secondary'],
        ownership: 'public',
        teaching_languages: null,
        address: 'Gladiolelor 2, SIBIU',
        lng: null,
        lat: null,
        is_excluded: false,
        source_date: '2025-10-08',
      },
      expect.objectContaining({
        siiir_code: '3261100002',
        parent_siiir_code: '3261100001',
        levels: ['kindergarten'],
        address: 'SIBIU',
      }),
      expect.objectContaining({
        siiir_code: '3261100003',
        ownership: 'private',
        is_excluded: true,
      }),
    ]);
  });

  it('rejects an export without the expected columns', () => {
    expect(() =>
      convertSiiirRows(
        [['Generat la data: 08/10/2025 14:26'], ['Cod SIIIR unitate', 'Denumire lunga unitate']],
        CITIES,
      ),
    ).toThrow('Tip unitate');
  });
});
