import { describe, expect, it } from 'vitest';

import { parseCsvRecords, readCsvObjects } from './csv.ts';

async function collect<T>(generator: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of generator) items.push(item);
  return items;
}

describe('parseCsvRecords', () => {
  it('splits records, strips the byte order mark and keeps quoted commas, quotes and newlines', async () => {
    const records = await collect(
      parseCsvRecords(['﻿a,b,c\r\n1,"x, ""y""",', '"multi\nline"\n2,,3']),
    );
    expect(records).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x, "y"', 'multi\nline'],
      ['2', '', '3'],
    ]);
  });

  it('handles a quote split across two chunks', async () => {
    const records = await collect(parseCsvRecords(['a,"he said "', '"hi""",b\n']));
    expect(records).toEqual([['a', 'he said "hi"', 'b']]);
  });

  it('skips blank lines', async () => {
    expect(await collect(parseCsvRecords(['a,b\n\n1,2\n']))).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('rejects a file that ends inside a quoted field', async () => {
    await expect(collect(parseCsvRecords(['a,"open\n']))).rejects.toMatchObject({
      code: 'csv_unterminated_quote',
    });
  });
});

describe('readCsvObjects', () => {
  it('maps the requested columns by header name, whatever their order', async () => {
    const rows = await collect(
      readCsvObjects(['z,name,id\n9, Ana ,1\n'], ['id', 'name'] as const, 'test.csv'),
    );
    expect(rows).toEqual([{ id: '1', name: 'Ana' }]);
  });

  it('names the missing columns when the source changed its format', async () => {
    await expect(
      collect(readCsvObjects(['id\n1\n'], ['id', 'name'] as const, 'test.csv')),
    ).rejects.toMatchObject({
      code: 'source_columns_changed',
      message: 'test.csv is missing the columns: name',
    });
  });
});
