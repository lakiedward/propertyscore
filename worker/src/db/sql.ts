import postgres from 'postgres';

export type Sql = postgres.Sql;

type JsonValue = postgres.JSONValue;

export type JsonObject = Record<string, JsonValue>;

export function createSql(databaseUrl: string): Sql {
  return postgres(databaseUrl, {
    max: 4,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
    onnotice: () => undefined,
  });
}
