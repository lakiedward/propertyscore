import { describe, expect, it } from 'vitest';

import { createLogger } from './logger.ts';

describe('createLogger', () => {
  it('writes JSON lines with the context and drops levels below the minimum', () => {
    const lines: string[] = [];
    const logger = createLogger('info', (line) => lines.push(line), { service: 'worker' });

    logger.debug('hidden');
    logger.info('city cells ready', { city: 'timisoara', cells: 2022 });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({
      level: 'info',
      message: 'city cells ready',
      service: 'worker',
      city: 'timisoara',
      cells: 2022,
    });
  });
});
