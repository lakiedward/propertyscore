import postgres from 'postgres';

export type Sql = postgres.Sql;

export type SqlTransaction = postgres.TransactionSql;

export type SqlQueries = postgres.ISql;

type JsonValue = postgres.JSONValue;

export type JsonObject = Record<string, JsonValue>;

export const LONG_STATEMENT_TIMEOUT = '3h';

const connectionOptions = {
  connect_timeout: 30,
  prepare: false,
  onnotice: () => undefined,
};

export function createSql(databaseUrl: string): Sql {
  return postgres(databaseUrl, { ...connectionOptions, max: 4, idle_timeout: 20 });
}

export function createSnapshotSql(databaseUrl: string, onDisconnect?: () => void): Sql {
  const sql = postgres(databaseUrl, {
    ...connectionOptions,
    max: 1,
    idle_timeout: 0,
    max_lifetime: null,
    onclose: () => {
      onDisconnect?.();
      void sql.end({ timeout: 0 });
    },
  });
  return sql;
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
