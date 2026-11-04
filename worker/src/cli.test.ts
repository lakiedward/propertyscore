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
    });
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
