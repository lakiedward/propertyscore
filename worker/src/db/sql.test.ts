import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, LONG_STATEMENT_TIMEOUT, type Sql, withLongStatements } from './sql.ts';

const databaseUrl = process.env.DATABASE_URL;

async function statementTimeout(sql: Pick<Sql, 'unsafe'>): Promise<string | undefined> {
  const [row] = await sql.unsafe<{ timeout: string }[]>(
    "select current_setting('statement_timeout') as timeout",
  );
  return row?.timeout;
}

describe.skipIf(!databaseUrl)('withLongStatements against the local database', () => {
  let sql: Sql;

  beforeAll(() => {
    sql = createSql(databaseUrl ?? '');
  });

  afterAll(async () => {
    await sql.end();
  });

  it('raises the statement timeout only inside its transaction', async () => {
    const before = await statementTimeout(sql);
    const inside = await withLongStatements(sql, (transaction) => statementTimeout(transaction));
    expect(inside).toBe(LONG_STATEMENT_TIMEOUT);
    expect(await statementTimeout(sql)).toBe(before);
  });

  it('returns the value of its callback', async () => {
    const value = await withLongStatements(sql, async (transaction) => {
      const [row] = await transaction<{ answer: number }[]>`select 42 as answer`;
      return row?.answer;
    });
    expect(value).toBe(42);
  });
});
