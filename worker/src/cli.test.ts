import { describe, expect, it } from 'vitest';

import { currentPeriod, parseCommand } from './cli.ts';

const NOW = new Date('2026-11-03T09:00:00Z');

describe('parseCommand', () => {
  it('builds the current month for every city and score by default', () => {
    expect(parseCommand(['build-snapshot'], NOW)).toEqual({
      command: 'build-snapshot',
      period: '2026-11-01',
      citySlugs: [],
      scoreKeys: [],
    });
  });

  it('reads the period, cities and scores', () => {
    expect(
      parseCommand(
        [
          'build-snapshot',
          '--period',
          '2026-10',
          '--city',
          'timisoara',
          '--city',
          'iasi',
          '--score',
          'green',
        ],
        NOW,
      ),
    ).toEqual({
      command: 'build-snapshot',
      period: '2026-10-01',
      citySlugs: ['timisoara', 'iasi'],
      scoreKeys: ['green'],
    });
  });

  it('rejects unknown commands, periods and scores with a code', () => {
    expect(() => parseCommand(['rebuild'], NOW)).toThrow(
      expect.objectContaining({ code: 'unknown_command' }),
    );
    expect(() => parseCommand(['build-snapshot', '--period', '2026-13'], NOW)).toThrow(
      expect.objectContaining({ code: 'invalid_period' }),
    );
    expect(() => parseCommand(['build-snapshot', '--score', 'parks'], NOW)).toThrow(
      expect.objectContaining({ code: 'invalid_score' }),
    );
  });
});

describe('parseCommand for reports', () => {
  it('reads the report to generate', () => {
    expect(
      parseCommand(['generate-report', '--report', 'd0000000-0000-4000-8000-000000000001'], NOW),
    ).toEqual({ command: 'generate-report', reportId: 'd0000000-0000-4000-8000-000000000001' });
    expect(() => parseCommand(['generate-report', '--report', '42'], NOW)).toThrow(
      expect.objectContaining({ code: 'invalid_report_id' }),
    );
  });

  it('reads the report to render as a PDF from the database or from a file', () => {
    expect(
      parseCommand(
        [
          'render-report-pdf',
          '--report',
          'd0000000-0000-4000-8000-000000000001',
          '--out',
          'report.pdf',
        ],
        NOW,
      ),
    ).toEqual({
      command: 'render-report-pdf',
      source: { reportId: 'd0000000-0000-4000-8000-000000000001' },
      outputPath: 'report.pdf',
    });
    expect(
      parseCommand(['render-report-pdf', '--input', 'report.json', '--out', 'report.pdf'], NOW),
    ).toEqual({
      command: 'render-report-pdf',
      source: { inputPath: 'report.json' },
      outputPath: 'report.pdf',
    });
    expect(() => parseCommand(['render-report-pdf', '--input', 'report.json'], NOW)).toThrow(
      expect.objectContaining({ code: 'invalid_render_report_pdf' }),
    );
    expect(() =>
      parseCommand(
        ['render-report-pdf', '--report', '42', '--input', 'report.json', '--out', 'report.pdf'],
        NOW,
      ),
    ).toThrow(expect.objectContaining({ code: 'invalid_render_report_pdf' }));
  });

  it('reads a report request with Romanian as the default language', () => {
    expect(
      parseCommand(
        [
          'create-report',
          '--email',
          'buyer@example.test',
          '--lat',
          '45.7537',
          '--lon',
          '21.2257',
          '--address',
          'Piața Victoriei 1, Timișoara',
        ],
        NOW,
      ),
    ).toEqual({
      command: 'create-report',
      ownerEmail: 'buyer@example.test',
      latitude: 45.7537,
      longitude: 21.2257,
      addressText: 'Piața Victoriei 1, Timișoara',
      locale: 'ro',
      declared: {
        areaM2: null,
        rooms: null,
        floor: null,
        buildingFloors: null,
        hasElevator: null,
        constructionYear: null,
      },
    });
  });

  it('reads the declared apartment details of a report request', () => {
    expect(
      parseCommand(
        [
          'create-report',
          '--email',
          'buyer@example.test',
          '--lat',
          '45.7537',
          '--lon',
          '21.2257',
          '--address',
          'Piața Victoriei 1, Timișoara',
          '--area',
          '58.5',
          '--rooms',
          '3',
          '--floor',
          '4',
          '--building-floors',
          '10',
          '--elevator',
          'no',
          '--year',
          '1978',
        ],
        NOW,
      ),
    ).toMatchObject({
      declared: {
        areaM2: 58.5,
        rooms: 3,
        floor: 4,
        buildingFloors: 10,
        hasElevator: false,
        constructionYear: 1978,
      },
    });
  });

  it('refuses an elevator answer other than yes or no', () => {
    expect(() =>
      parseCommand(
        [
          'create-report',
          '--email',
          'a@b.ro',
          '--lat',
          '45',
          '--lon',
          '21',
          '--address',
          'Strada 1',
          '--elevator',
          'maybe',
        ],
        NOW,
      ),
    ).toThrow(expect.objectContaining({ code: 'invalid_report_request' }));
  });

  it('names the invalid fields of a report request', () => {
    expect(() =>
      parseCommand(['create-report', '--email', 'nope', '--lat', '91', '--lon', '21'], NOW),
    ).toThrow(
      expect.objectContaining({
        code: 'invalid_report_request',
        message: 'create-report needs valid: email, lat, address',
      }),
    );
  });
});

describe('currentPeriod', () => {
  it('uses the UTC month', () => {
    expect(currentPeriod(new Date('2026-01-31T23:30:00Z'))).toBe('2026-01');
  });
});

describe('parseCommand for the Health sources import', () => {
  it('defaults to every city, the sources folder and the first day of the month', () => {
    expect(parseCommand(['import-health-sources'], NOW)).toEqual({
      command: 'import-health-sources',
      dir: null,
      citySlugs: [],
      validFrom: '2026-11-01',
      period: '2026-11-01',
    });
  });

  it('reads the folder, cities and the date the emergency list takes effect', () => {
    expect(
      parseCommand(
        [
          'import-health-sources',
          '--dir',
          '/data/health',
          '--city',
          'sibiu',
          '--valid-from',
          '2026-10-15',
        ],
        NOW,
      ),
    ).toMatchObject({ dir: '/data/health', citySlugs: ['sibiu'], validFrom: '2026-10-15' });
    expect(() =>
      parseCommand(['import-health-sources', '--valid-from', '2026-13-01'], NOW),
    ).toThrow(expect.objectContaining({ code: 'invalid_valid_from' }));
  });
});

describe('parseCommand for the city averages import', () => {
  it('reads the source, the file and the exchange rate', () => {
    expect(
      parseCommand(
        [
          'import-city-averages',
          '--source',
          'imobiliare_index',
          '--file',
          '/data/city-averages.csv',
          '--eur-ron',
          '4.97',
        ],
        NOW,
      ),
    ).toEqual({
      command: 'import-city-averages',
      source: 'imobiliare_index',
      filePath: '/data/city-averages.csv',
      eurRonRate: 4.97,
    });
  });

  it('names the invalid fields', () => {
    expect(() => parseCommand(['import-city-averages', '--source', 'Imobiliare'], NOW)).toThrow(
      expect.objectContaining({ code: 'invalid_city_averages_import' }),
    );
  });
});

describe('parseCommand import-market-statistics', () => {
  it('reads every source for every covered city in the current month by default', () => {
    expect(parseCommand(['import-market-statistics'], NOW)).toEqual({
      command: 'import-market-statistics',
      sources: ['apartamente_org', 'apartamente_org_index', 'imospot_index'],
      citySlugs: [],
      period: '2026-11-01',
      isRetry: false,
    });
  });

  it('reads a source again in the same month only when asked to', () => {
    expect(parseCommand(['import-market-statistics', '--retry'], NOW)).toMatchObject({
      isRetry: true,
    });
  });

  it('narrows the sources and the cities, keeping the source order', () => {
    expect(
      parseCommand(
        [
          'import-market-statistics',
          '--source',
          'imospot_index',
          '--source',
          'apartamente_org',
          '--city',
          'timisoara',
        ],
        NOW,
      ),
    ).toMatchObject({ sources: ['apartamente_org', 'imospot_index'], citySlugs: ['timisoara'] });
  });

  it('reads a past edition only of the index that allows it', () => {
    expect(
      parseCommand(
        ['import-market-statistics', '--source', 'imospot_index', '--period', '2026-08'],
        NOW,
      ),
    ).toMatchObject({ sources: ['imospot_index'], period: '2026-08-01' });
    expect(() => parseCommand(['import-market-statistics', '--period', '2026-08'], NOW)).toThrow(
      expect.objectContaining({ code: 'past_edition_not_agreed' }),
    );
    expect(() =>
      parseCommand(
        ['import-market-statistics', '--source', 'imospot_index', '--period', '2026-12'],
        NOW,
      ),
    ).toThrow(expect.objectContaining({ code: 'invalid_period' }));
  });

  it('refuses a source without an agreement', () => {
    expect(() =>
      parseCommand(['import-market-statistics', '--source', 'imobiliare_ro'], NOW),
    ).toThrow(expect.objectContaining({ code: 'invalid_market_statistics_import' }));
  });
});
