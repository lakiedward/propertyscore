import { WorkerError } from '../lib/errors.ts';
import { readZipMember } from './zip.ts';

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity: string, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    }
    if (code.startsWith('#')) return String.fromCodePoint(Number(code.slice(1)));
    return ENTITIES[code] ?? entity;
  });
}

function textRuns(xml: string): string {
  let text = '';
  for (const match of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) text += match[1] ?? '';
  return decodeXml(text);
}

export function parseSharedStrings(xml: string): string[] {
  return Array.from(xml.matchAll(/<si>([\s\S]*?)<\/si>|<si\/>/g), (match) =>
    textRuns(match[1] ?? ''),
  );
}

function columnIndex(letters: string): number {
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

function attribute(attributes: string, name: string): string | undefined {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(attributes)?.[1];
}

function cellValue(attributes: string, body: string, shared: readonly string[]): string {
  const type = attribute(attributes, 't');
  if (type === 'inlineStr') return textRuns(body);
  const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
  if (raw === undefined) return '';
  if (type === 's') {
    const value = shared[Number(raw)];
    if (value === undefined) {
      throw new WorkerError('xlsx_invalid', `Shared string ${raw} is missing`);
    }
    return value;
  }
  return decodeXml(raw);
}

const ROW_PATTERN = /<row\b(?:[^>]*[^/>])?>([\s\S]*?)<\/row>/g;

function parseRow(body: string, shared: readonly string[]): string[] {
  const cells: string[] = [];
  for (const cellMatch of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attributes = cellMatch[1] ?? '';
    const reference = attribute(attributes, 'r');
    const letters = reference ? /^([A-Z]+)/.exec(reference)?.[1] : undefined;
    const index = letters ? columnIndex(letters) : cells.length;
    while (cells.length < index) cells.push('');
    cells[index] = cellValue(attributes, cellMatch[2] ?? '', shared).trim();
  }
  return cells;
}

export async function* sheetRows(
  chunks: AsyncIterable<string> | Iterable<string>,
  shared: readonly string[],
): AsyncGenerator<string[]> {
  let buffer = '';
  for await (const chunk of chunks) {
    buffer += chunk;
    let consumed = 0;
    for (const match of buffer.matchAll(ROW_PATTERN)) {
      const cells = parseRow(match[1] ?? '', shared);
      if (cells.some((cell) => cell !== '')) yield cells;
      consumed = match.index + match[0].length;
    }
    if (consumed > 0) buffer = buffer.slice(consumed);
  }
}

async function readMember(path: string, member: string): Promise<string> {
  let text = '';
  for await (const chunk of readZipMember(path, member)) text += chunk;
  return text;
}

async function readSharedStrings(path: string): Promise<string[]> {
  try {
    return parseSharedStrings(await readMember(path, 'xl/sharedStrings.xml'));
  } catch (error) {
    if (error instanceof WorkerError && error.code === 'unzip_failed') return [];
    throw error;
  }
}

export async function* streamXlsxRows(path: string, sheet = 1): AsyncGenerator<string[]> {
  const shared = await readSharedStrings(path);
  try {
    yield* sheetRows(readZipMember(path, `xl/worksheets/sheet${String(sheet)}.xml`), shared);
  } catch (error) {
    if (error instanceof WorkerError && error.code === 'unzip_failed') {
      throw new WorkerError('xlsx_invalid', `${path} is not a readable XLSX workbook`, {
        cause: error,
      });
    }
    throw error;
  }
}

export async function readXlsxRows(path: string, sheet = 1): Promise<string[][]> {
  const rows: string[][] = [];
  for await (const row of streamXlsxRows(path, sheet)) rows.push(row);
  return rows;
}
