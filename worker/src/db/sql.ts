import postgres from 'postgres';

export type Sql = postgres.Sql;

export type SqlTransaction = postgres.TransactionSql;

type JsonValue = postgres.JSONValue;

export type JsonObject = Record<string, JsonValue>;

export const LONG_STATEMENT_TIMEOUT = '3h';

export function createSql(databaseUrl: string): Sql {
  return postgres(databaseUrl, {
    max: 4,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
    onnotice: () => undefined,
  });
}

export async function withLongStatements<T>(
  sql: Sql,
  run: (transaction: SqlTransaction) => Promise<T>,
): Promise<T> {
  const result = await sql.begin(async (transaction) => {
    await transaction`select set_config('statement_timeout', ${LONG_STATEMENT_TIMEOUT}, true)`;
    return { value: await run(transaction) };
  });
  return result.value;
}
