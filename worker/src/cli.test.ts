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

describe('currentPeriod', () => {
  it('uses the UTC month', () => {
    expect(currentPeriod(new Date('2026-01-31T23:30:00Z'))).toBe('2026-01');
  });
});
