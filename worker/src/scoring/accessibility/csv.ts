import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export function splitCsvLine(line: string): { fields: string[]; isOpen: boolean } {
  const fields: string[] = [];
  let field = '';
  let isQuoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line.charAt(index);
    if (isQuoted) {
      if (char === '"' && line.charAt(index + 1) === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        isQuoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      isQuoted = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field);
  return { fields, isOpen: isQuoted };
}

export async function* readCsvRecords(path: string): AsyncGenerator<Record<string, string>> {
  const lines = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  let header: string[] | null = null;
  let pending = '';
  for await (const rawLine of lines) {
    const line = pending === '' ? rawLine : `${pending}\n${rawLine}`;
    const { fields, isOpen } = splitCsvLine(line);
    if (isOpen) {
      pending = line;
      continue;
    }
    pending = '';
    if (!header) {
      header = fields.map((name, index) =>
        (index === 0 && name.charCodeAt(0) === 0xfeff ? name.slice(1) : name).trim(),
      );
      continue;
    }
    if (fields.length === 1 && fields[0]?.trim() === '') continue;
    const record: Record<string, string> = {};
    header.forEach((name, index) => {
      record[name] = (fields[index] ?? '').trim();
    });
    yield record;
  }
}
