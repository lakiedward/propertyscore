import { WorkerError } from '../../lib/errors.ts';
import type { EducationLevel } from './education.osm.ts';

export type UnitPlan = {
  regularLevels: EducationLevel[];
  otherLevels: EducationLevel[];
  teachingLanguages: string[];
  hasPostSecondary: boolean;
};

export type SchoolingPlan = ReadonlyMap<string, UnitPlan>;

const COLUMNS = {
  code: 'Cod SIIIR unitate',
  level: 'Nivel invatamant',
  kind: 'Tip invatamant',
  form: 'Forma invatamant',
  language: 'Limba predare',
  secondChance: 'A doua sansa',
} as const;

type Column = keyof typeof COLUMNS;

const PLAN_LEVELS: Record<string, EducationLevel> = {
  antepreșcolar: 'nursery',
  antepreşcolar: 'nursery',
  preșcolar: 'kindergarten',
  preşcolar: 'kindergarten',
  primar: 'primary',
  gimnazial: 'lower_secondary',
  liceal: 'upper_secondary',
  profesional: 'upper_secondary',
};

const DAY_FORMS = new Set(['zi', 'normal', 'prelungit', 'săptămânal']);

const LANGUAGES: Record<string, string> = {
  română: 'ro',
  maghiară: 'hu',
  germană: 'de',
  engleză: 'en',
  franceză: 'fr',
  italiană: 'it',
  spaniolă: 'es',
  ucraineană: 'uk',
  slovacă: 'sk',
  sârbă: 'sr',
  croată: 'hr',
  cehă: 'cs',
  bulgară: 'bg',
  turcă: 'tr',
  polonă: 'pl',
  'romani (rromani)': 'rom',
};

const LEVEL_ORDER: readonly EducationLevel[] = [
  'nursery',
  'kindergarten',
  'primary',
  'lower_secondary',
  'upper_secondary',
  'university',
];

type UnitDraft = {
  regular: Set<EducationLevel>;
  other: Set<EducationLevel>;
  languages: Set<string>;
  hasPostSecondary: boolean;
};

function ordered(levels: ReadonlySet<EducationLevel>): EducationLevel[] {
  return LEVEL_ORDER.filter((level) => levels.has(level));
}

export function mergeLevels(...groups: readonly (readonly EducationLevel[])[]): EducationLevel[] {
  return ordered(new Set(groups.flat()));
}

function languageCode(value: string): string | null {
  const name = value
    .trim()
    .toLowerCase()
    .replace(/^limba\s+/, '');
  return LANGUAGES[name] ?? null;
}

function columnPositions(header: readonly string[]): Record<Column, number> {
  const missing = Object.values(COLUMNS).filter((title) => !header.includes(title));
  if (missing.length > 0) {
    throw new WorkerError(
      'education_plan_invalid',
      `The schooling plan lacks the columns: ${missing.join(', ')}`,
    );
  }
  return Object.fromEntries(
    Object.entries(COLUMNS).map(([key, title]) => [key, header.indexOf(title)]),
  ) as Record<Column, number>;
}

export async function readSchoolingPlan(
  rows: AsyncIterable<string[]> | Iterable<string[]>,
): Promise<SchoolingPlan> {
  const drafts = new Map<string, UnitDraft>();
  let position: Record<Column, number> | null = null;

  for await (const row of rows) {
    if (!position) {
      if (row.includes(COLUMNS.code) && row.includes(COLUMNS.level))
        position = columnPositions(row);
      continue;
    }
    const at = position;
    const cell = (column: Column) => (row[at[column]] ?? '').trim();
    const code = cell('code');
    if (code === '') continue;
    const draft = drafts.get(code) ?? {
      regular: new Set<EducationLevel>(),
      other: new Set<EducationLevel>(),
      languages: new Set<string>(),
      hasPostSecondary: false,
    };
    drafts.set(code, draft);

    const levelName = cell('level').toLowerCase();
    if (levelName === 'postliceal') {
      draft.hasPostSecondary = true;
      continue;
    }
    const level = PLAN_LEVELS[levelName];
    if (!level) continue;
    const isRegular =
      cell('kind').toLowerCase() === 'masă' &&
      DAY_FORMS.has(cell('form').toLowerCase()) &&
      cell('secondChance') === '';
    if (!isRegular) {
      draft.other.add(level);
      continue;
    }
    draft.regular.add(level);
    const language = languageCode(cell('language'));
    if (language) draft.languages.add(language);
  }

  if (!position) {
    throw new WorkerError('education_plan_invalid', 'The schooling plan has no header row');
  }

  return new Map(
    [...drafts].map(([code, draft]) => [
      code,
      {
        regularLevels: ordered(draft.regular),
        otherLevels: ordered(draft.other),
        teachingLanguages: [...draft.languages].sort(),
        hasPostSecondary: draft.hasPostSecondary,
      },
    ]),
  );
}
