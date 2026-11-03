export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, string | number | boolean | null | undefined>;

export type Logger = Record<LogLevel, (message: string, fields?: LogFields) => void>;

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(
  minimumLevel: LogLevel,
  write: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
  context: LogFields = {},
): Logger {
  const log =
    (level: LogLevel) =>
    (message: string, fields: LogFields = {}) => {
      if (LEVEL_ORDER[level] < LEVEL_ORDER[minimumLevel]) return;
      write(
        JSON.stringify({ time: new Date().toISOString(), level, message, ...context, ...fields }),
      );
    };
  return { debug: log('debug'), info: log('info'), warn: log('warn'), error: log('error') };
}
