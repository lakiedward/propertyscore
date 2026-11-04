import { parseArgs } from 'node:util';

import { z } from 'zod';

import { WorkerError } from './lib/errors.ts';
import { CATEGORY_KEYS, type CategoryKey } from './scoring/categories.ts';

export type BuildSnapshotCommand = {
  command: 'build-snapshot';
  period: string;
  citySlugs: string[];
  scoreKeys: CategoryKey[];
};

export type GenerateReportCommand = {
  command: 'generate-report';
  reportId: string;
};

export type CreateReportCommand = {
  command: 'create-report';
  ownerEmail: string;
  latitude: number;
  longitude: number;
  addressText: string;
  locale: 'ro' | 'en';
};

export type ImportHealthSourcesCommand = {
  command: 'import-health-sources';
  dir: string | null;
  citySlugs: string[];
  validFrom: string;
  period: string;
};

export type ImportMarketListingsCommand = {
  command: 'import-market-listings';
  source: string;
  period: string;
  filePath: string;
  eurRonRate: number | null;
};

export type WorkerCommand =
  | BuildSnapshotCommand
  | GenerateReportCommand
  | CreateReportCommand
  | ImportMarketListingsCommand
  | ImportHealthSourcesCommand;

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const reportIdSchema = z.uuid();

const createReportSchema = z.object({
  email: z.email(),
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  address: z.string().trim().min(3).max(300),
  locale: z.enum(['ro', 'en']).default('ro'),
});

const importMarketListingsSchema = z.object({
  source: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
  period: z.string().regex(PERIOD),
  file: z.string().min(1),
  'eur-ron': z.coerce.number().positive().optional(),
});

function isCategoryKey(value: string): value is CategoryKey {
  return CATEGORY_KEYS.some((key) => key === value);
}

export function currentPeriod(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parseBuildSnapshot(argv: readonly string[], now: Date): BuildSnapshotCommand {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      period: { type: 'string' },
      city: { type: 'string', multiple: true },
      score: { type: 'string', multiple: true },
    },
  });

  const period = values.period ?? currentPeriod(now);
  if (!PERIOD.test(period)) {
    throw new WorkerError('invalid_period', `Period must be YYYY-MM, got ${period}`);
  }

  const scoreKeys = values.score ?? [];
  const unknownScores = scoreKeys.filter((key) => !isCategoryKey(key));
  if (unknownScores.length > 0) {
    throw new WorkerError('invalid_score', `Unknown score: ${unknownScores.join(', ')}`);
  }

  return {
    command: 'build-snapshot',
    period: `${period}-01`,
    citySlugs: values.city ?? [],
    scoreKeys: scoreKeys.filter(isCategoryKey),
  };
}

function parseGenerateReport(argv: readonly string[]): GenerateReportCommand {
  const { values } = parseArgs({ args: [...argv], options: { report: { type: 'string' } } });
  const reportId = reportIdSchema.safeParse(values.report);
  if (!reportId.success) {
    throw new WorkerError('invalid_report_id', 'generate-report needs --report <uuid>');
  }
  return { command: 'generate-report', reportId: reportId.data };
}

function parseCreateReport(argv: readonly string[]): CreateReportCommand {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      email: { type: 'string' },
      lat: { type: 'string' },
      lon: { type: 'string' },
      address: { type: 'string' },
      locale: { type: 'string' },
    },
  });
  const parsed = createReportSchema.safeParse(values);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError('invalid_report_request', `create-report needs valid: ${fields}`);
  }
  return {
    command: 'create-report',
    ownerEmail: parsed.data.email,
    latitude: parsed.data.lat,
    longitude: parsed.data.lon,
    addressText: parsed.data.address,
    locale: parsed.data.locale,
  };
}

function parseImportHealthSources(argv: readonly string[], now: Date): ImportHealthSourcesCommand {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      dir: { type: 'string' },
      city: { type: 'string', multiple: true },
      'valid-from': { type: 'string' },
    },
  });
  const period = `${currentPeriod(now)}-01`;
  const validFrom = values['valid-from'] ?? period;
  if (!ISO_DATE.test(validFrom)) {
    throw new WorkerError(
      'invalid_valid_from',
      `--valid-from must be YYYY-MM-DD, got ${validFrom}`,
    );
  }
  return {
    command: 'import-health-sources',
    dir: values.dir ?? null,
    citySlugs: values.city ?? [],
    validFrom,
    period,
  };
}

function parseImportMarketListings(argv: readonly string[]): ImportMarketListingsCommand {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      source: { type: 'string' },
      period: { type: 'string' },
      file: { type: 'string' },
      'eur-ron': { type: 'string' },
    },
  });
  const parsed = importMarketListingsSchema.safeParse(values);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError('invalid_market_import', `import-market-listings needs valid: ${fields}`);
  }
  return {
    command: 'import-market-listings',
    source: parsed.data.source,
    period: `${parsed.data.period}-01`,
    filePath: parsed.data.file,
    eurRonRate: parsed.data['eur-ron'] ?? null,
  };
}

export function parseCommand(argv: readonly string[], now: Date): WorkerCommand {
  const [command, ...rest] = argv;
  switch (command) {
    case 'build-snapshot':
      return parseBuildSnapshot(rest, now);
    case 'generate-report':
      return parseGenerateReport(rest);
    case 'create-report':
      return parseCreateReport(rest);
    case 'import-health-sources':
      return parseImportHealthSources(rest, now);
    case 'import-market-listings':
      return parseImportMarketListings(rest);
    default:
      throw new WorkerError('unknown_command', `Unknown command: ${command ?? '(none)'}`);
  }
}
