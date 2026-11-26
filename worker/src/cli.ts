import { parseArgs } from 'node:util';

import { z } from 'zod';

import { WorkerError } from './lib/errors.ts';
import type { DeclaredDetails } from './report/declared.ts';
import { CATEGORY_KEYS, type CategoryKey } from './scoring/categories.ts';
import {
  MARKET_STATISTICS_SOURCES,
  PAST_EDITION_SOURCES,
  type MarketStatisticsSource,
} from './scoring/investment/area-statistics-import.ts';

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

export type ServeReportsCommand = {
  command: 'serve-reports';
};

export type CreateReportCommand = {
  command: 'create-report';
  ownerEmail: string;
  latitude: number;
  longitude: number;
  addressText: string;
  locale: 'ro' | 'en';
  declared: DeclaredDetails;
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

export type ImportCityAveragesCommand = {
  command: 'import-city-averages';
  source: string;
  filePath: string;
  eurRonRate: number | null;
};

export type ImportMarketStatisticsCommand = {
  command: 'import-market-statistics';
  sources: MarketStatisticsSource[];
  isRetry: boolean;
  citySlugs: string[];
  period: string;
};

export type RenderReportPdfCommand = {
  command: 'render-report-pdf';
  source: { reportId: string } | { inputPath: string };
  outputPath: string;
};

export type RefreshReportPdfCommand = {
  command: 'refresh-report-pdf';
  reportId: string;
};

export type WorkerCommand =
  | BuildSnapshotCommand
  | GenerateReportCommand
  | ServeReportsCommand
  | RenderReportPdfCommand
  | RefreshReportPdfCommand
  | CreateReportCommand
  | ImportMarketListingsCommand
  | ImportCityAveragesCommand
  | ImportMarketStatisticsCommand
  | ImportHealthSourcesCommand;

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const reportIdSchema = z.uuid();

function numericOption(schema: z.ZodType<number>) {
  return z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? Number.NaN : value),
    schema,
  );
}

const createReportSchema = z.object({
  email: z.email(),
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  address: z.string().trim().min(3).max(300),
  locale: z.enum(['ro', 'en']).default('ro'),
  area: numericOption(z.coerce.number().positive().max(99999)).optional(),
  rooms: numericOption(z.coerce.number().int().min(1).max(20)).optional(),
  floor: numericOption(z.coerce.number().int().min(-2).max(60)).optional(),
  'building-floors': numericOption(z.coerce.number().int().min(1).max(60)).optional(),
  elevator: z.enum(['yes', 'no']).optional(),
  year: numericOption(z.coerce.number().int().min(1800).max(2100)).optional(),
});

const CITY_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const MARKET_SOURCE = /^[a-z][a-z0-9_]{1,39}$/;

const importMarketListingsSchema = z.object({
  source: z.string().regex(MARKET_SOURCE),
  period: z.string().regex(PERIOD),
  file: z.string().min(1),
  'eur-ron': z.coerce.number().positive().optional(),
});

const importCityAveragesSchema = z.object({
  source: z.string().regex(MARKET_SOURCE),
  file: z.string().min(1),
  'eur-ron': z.coerce.number().positive().optional(),
});

const importMarketStatisticsSchema = z.object({
  source: z.array(z.enum(MARKET_STATISTICS_SOURCES)).default([...MARKET_STATISTICS_SOURCES]),
  city: z.array(z.string().regex(CITY_SLUG)).default([]),
  period: z.string().regex(PERIOD).optional(),
  retry: z.boolean().default(false),
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

function parseServeReports(argv: readonly string[]): ServeReportsCommand {
  parseArgs({ args: [...argv], options: {} });
  return { command: 'serve-reports' };
}

function parseRenderReportPdf(argv: readonly string[]): RenderReportPdfCommand {
  const { values } = parseArgs({
    args: [...argv],
    options: { report: { type: 'string' }, input: { type: 'string' }, out: { type: 'string' } },
  });
  if (!values.out || (values.report === undefined) === (values.input === undefined)) {
    throw new WorkerError(
      'invalid_render_report_pdf',
      'render-report-pdf needs --out <file.pdf> and either --report <uuid> or --input <file.json>',
    );
  }
  if (values.input !== undefined) {
    return {
      command: 'render-report-pdf',
      source: { inputPath: values.input },
      outputPath: values.out,
    };
  }
  const reportId = reportIdSchema.safeParse(values.report);
  if (!reportId.success) {
    throw new WorkerError('invalid_report_id', 'render-report-pdf needs --report <uuid>');
  }
  return {
    command: 'render-report-pdf',
    source: { reportId: reportId.data },
    outputPath: values.out,
  };
}

function parseRefreshReportPdf(argv: readonly string[]): RefreshReportPdfCommand {
  const { values } = parseArgs({
    args: [...argv],
    options: { report: { type: 'string', multiple: true }, apply: { type: 'boolean' } },
  });
  if (!values.apply) {
    throw new WorkerError(
      'invalid_refresh_report_pdf',
      'refresh-report-pdf needs --apply to replace the stored PDF',
    );
  }
  const reports = values.report ?? [];
  const reportId = reportIdSchema.safeParse(reports[0]);
  if (reports.length !== 1 || !reportId.success) {
    throw new WorkerError(
      'invalid_report_id',
      'refresh-report-pdf needs exactly one --report <uuid>',
    );
  }
  return { command: 'refresh-report-pdf', reportId: reportId.data };
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
      area: { type: 'string' },
      rooms: { type: 'string' },
      floor: { type: 'string' },
      'building-floors': { type: 'string' },
      elevator: { type: 'string' },
      year: { type: 'string' },
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
    declared: {
      areaM2: parsed.data.area ?? null,
      rooms: parsed.data.rooms ?? null,
      floor: parsed.data.floor ?? null,
      buildingFloors: parsed.data['building-floors'] ?? null,
      hasElevator: parsed.data.elevator === undefined ? null : parsed.data.elevator === 'yes',
      constructionYear: parsed.data.year ?? null,
    },
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

function parseImportCityAverages(argv: readonly string[]): ImportCityAveragesCommand {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      source: { type: 'string' },
      file: { type: 'string' },
      'eur-ron': { type: 'string' },
    },
  });
  const parsed = importCityAveragesSchema.safeParse(values);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError(
      'invalid_city_averages_import',
      `import-city-averages needs valid: ${fields}`,
    );
  }
  return {
    command: 'import-city-averages',
    source: parsed.data.source,
    filePath: parsed.data.file,
    eurRonRate: parsed.data['eur-ron'] ?? null,
  };
}

function parseImportMarketStatistics(
  argv: readonly string[],
  now: Date,
): ImportMarketStatisticsCommand {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      source: { type: 'string', multiple: true },
      city: { type: 'string', multiple: true },
      period: { type: 'string' },
      retry: { type: 'boolean' },
    },
  });
  const parsed = importMarketStatisticsSchema.safeParse(values);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path[0]).join(', ');
    throw new WorkerError(
      'invalid_market_statistics_import',
      `import-market-statistics needs valid: ${fields}`,
    );
  }
  const sources = MARKET_STATISTICS_SOURCES.filter((source) => parsed.data.source.includes(source));
  const thisMonth = currentPeriod(now);
  const period = parsed.data.period ?? thisMonth;
  if (period > thisMonth) {
    throw new WorkerError('invalid_period', `Period ${period} has not started yet`);
  }
  if (period < thisMonth && sources.some((source) => !PAST_EDITION_SOURCES.includes(source))) {
    throw new WorkerError(
      'past_edition_not_agreed',
      `Only ${PAST_EDITION_SOURCES.join(', ')} may be read for a past month`,
    );
  }
  return {
    command: 'import-market-statistics',
    sources,
    citySlugs: parsed.data.city,
    period: `${period}-01`,
    isRetry: parsed.data.retry,
  };
}

export function parseCommand(argv: readonly string[], now: Date): WorkerCommand {
  const [command, ...rest] = argv;
  switch (command) {
    case 'build-snapshot':
      return parseBuildSnapshot(rest, now);
    case 'generate-report':
      return parseGenerateReport(rest);
    case 'serve-reports':
      return parseServeReports(rest);
    case 'render-report-pdf':
      return parseRenderReportPdf(rest);
    case 'refresh-report-pdf':
      return parseRefreshReportPdf(rest);
    case 'create-report':
      return parseCreateReport(rest);
    case 'import-health-sources':
      return parseImportHealthSources(rest, now);
    case 'import-market-listings':
      return parseImportMarketListings(rest);
    case 'import-city-averages':
      return parseImportCityAverages(rest);
    case 'import-market-statistics':
      return parseImportMarketStatistics(rest, now);
    default:
      throw new WorkerError('unknown_command', `Unknown command: ${command ?? '(none)'}`);
  }
}
