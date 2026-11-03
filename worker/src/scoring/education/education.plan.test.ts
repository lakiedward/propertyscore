import { describe, expect, it } from 'vitest';

import { WorkerError } from '../../lib/errors.ts';
import { mergeLevels, readSchoolingPlan } from './education.plan.ts';

const HEADER = [
  'Cod SIIIR unitate',
  'Nivel invatamant',
  'Tip invatamant',
  'Forma invatamant',
  'Limba predare',
  'A doua sansa',
];

function row(
  code: string,
  level: string,
  overrides: { kind?: string; form?: string; language?: string; secondChance?: string } = {},
): string[] {
  return [
    code,
    level,
    overrides.kind ?? 'Masă',
    overrides.form ?? 'Zi',
    overrides.language ?? 'Limba română',
    overrides.secondChance ?? '',
  ];
}

describe('readSchoolingPlan', () => {
  it('collects the regular day levels and teaching languages of each unit', async () => {
    const plan = await readSchoolingPlan([
      HEADER,
      row('1', 'Liceal'),
      row('1', 'Gimnazial', { language: 'Limba maghiară' }),
      row('1', 'Primar'),
      row('2', 'Preșcolar', { form: 'Prelungit' }),
      row('2', 'Antepreşcolar', { form: 'Normal' }),
    ]);
    expect(plan.get('1')).toEqual({
      regularLevels: ['primary', 'lower_secondary', 'upper_secondary'],
      otherLevels: [],
      teachingLanguages: ['hu', 'ro'],
      hasPostSecondary: false,
    });
    expect(plan.get('2')?.regularLevels).toEqual(['nursery', 'kindergarten']);
  });

  it('keeps evening, part-time, second-chance and special classes apart', async () => {
    const plan = await readSchoolingPlan([
      HEADER,
      row('1', 'Liceal', { form: 'Seral' }),
      row('1', 'Gimnazial', { form: 'Frecvență redusă' }),
      row('1', 'Primar', { secondChance: 'DA' }),
      row('2', 'Gimnazial', { kind: 'Special', language: 'Limba germană' }),
      row('3', 'Postliceal'),
    ]);
    expect(plan.get('1')).toMatchObject({
      regularLevels: [],
      otherLevels: ['primary', 'lower_secondary', 'upper_secondary'],
      teachingLanguages: [],
    });
    expect(plan.get('2')?.otherLevels).toEqual(['lower_secondary']);
    expect(plan.get('3')).toMatchObject({ regularLevels: [], hasPostSecondary: true });
  });

  it('rejects a file without the expected header', async () => {
    await expect(readSchoolingPlan([['Cod SIIIR unitate', 'Nivel invatamant']])).rejects.toThrow(
      WorkerError,
    );
    await expect(readSchoolingPlan([['An', 'Judet']])).rejects.toMatchObject({
      code: 'education_plan_invalid',
    });
  });
});

describe('mergeLevels', () => {
  it('joins level lists in school order without repeats', () => {
    expect(mergeLevels(['upper_secondary', 'primary'], ['primary', 'kindergarten'])).toEqual([
      'kindergarten',
      'primary',
      'upper_secondary',
    ]);
  });
});
