import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { WorkerError } from '../lib/errors.ts';

const run = promisify(execFile);

const HEADER_WORD =
  /(^|[^a-z])(nr|crt|denumire|denumirea|furnizor|furnizorului|adresa|telefon|localitate|localitatea|sediu|sediul)([^a-z]|$)/;

const NUMBERED_LINE = /^\s{0,12}(\d{1,5})(\s|$)/;

export const PDF_BLANK_SHARES = [0.97, 0.92, 0.85] as const;

const DEFAULT_BLANK_SHARE = 0.92;

const MIN_NUMBERED = 3;

const FLAT_SHARE = 0.7;

type Line = { page: number; text: string };

type Span = { start: number; end: number };

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function squash(text: string): string {
  return normalize(text).replace(/\s+/g, ' ').trim();
}

function isHeaderLine(text: string): boolean {
  return HEADER_WORD.test(normalize(text)) && !/\d{2,}/.test(text);
}

function columnSpans(lines: readonly string[], blankShare: number): Span[] {
  const width = Math.max(0, ...lines.map((line) => line.length));
  const filled = new Array<number>(width).fill(0);
  for (const line of lines) {
    for (let index = 0; index < line.length; index += 1) {
      if (line[index] !== ' ') filled[index] = (filled[index] ?? 0) + 1;
    }
  }
  const threshold = lines.length * (1 - blankShare);
  const spans: Span[] = [];
  let start: number | null = null;
  for (let index = 0; index <= width; index += 1) {
    const isFilled = index < width && (filled[index] ?? 0) > threshold;
    if (isFilled && start === null) start = index;
    if (!isFilled && start !== null) {
      spans.push({ start, end: index });
      start = null;
    }
  }
  return spans;
}

function assignWords(text: string, spans: readonly Span[]): string[][] {
  const cells = spans.map(() => [] as string[]);
  for (const word of text.matchAll(/\S+/g)) {
    const start = word.index;
    const end = start + word[0].length;
    let best = -1;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const [index, span] of spans.entries()) {
      const overlap = Math.min(end, span.end) - Math.max(start, span.start);
      const score = overlap > 0 ? overlap : overlap - 0.5;
      if (score > bestScore) {
        best = index;
        bestScore = score;
      }
    }
    cells[best]?.push(word[0]);
  }
  return cells;
}

function mergeCells(target: string[][], lineCells: readonly string[][]): void {
  for (const [index, words] of lineCells.entries()) target[index]?.push(...words);
}

function numberedLines(lines: readonly Line[]): number[] {
  const numbered: number[] = [];
  let expected: number | null = null;
  for (const [index, line] of lines.entries()) {
    const match = NUMBERED_LINE.exec(line.text);
    if (!match) continue;
    const value = Number(match[1]);
    if (expected === null || value === expected) {
      numbered.push(index);
      expected = value + 1;
    }
  }
  return numbered.length >= MIN_NUMBERED ? numbered : [];
}

function headerBlock(lines: readonly Line[], before: number): number[] {
  const header: number[] = [];
  if (before < lines.length) {
    for (let index = before - 1; index >= 0; index -= 1) {
      const line = lines[index];
      if (line === undefined || line.page !== lines[before]?.page) break;
      if (isHeaderLine(line.text)) header.unshift(index);
      else if (header.length > 0) break;
    }
    return header;
  }
  for (const [index, line] of lines.entries()) {
    if (isHeaderLine(line.text)) header.push(index);
    else if (header.length > 0) break;
  }
  return header;
}

export function layoutTableRows(text: string, blankShare = DEFAULT_BLANK_SHARE): string[][] {
  const lines: Line[] = text
    .split('\f')
    .flatMap((page, pageIndex) =>
      page.split('\n').map((line) => ({ page: pageIndex, text: line.replace(/\s+$/, '') })),
    )
    .filter((line) => line.text.trim() !== '');

  let numbered = numberedLines(lines);
  const headerLines = headerBlock(lines, numbered[0] ?? lines.length);
  const headerStart = headerLines[0];
  const headerEnd = headerLines.at(-1);
  if (headerStart === undefined || headerEnd === undefined) return [];

  const headerTexts = new Set(headerLines.map((index) => squash(lines[index]?.text ?? '')));
  const isRepeatedHeader = (index: number) => headerTexts.has(squash(lines[index]?.text ?? ''));
  const body: number[] = [];
  for (let index = headerEnd + 1; index < lines.length; index += 1) {
    if (!isRepeatedHeader(index)) body.push(index);
  }
  const spans = columnSpans(
    body.map((index) => lines[index]?.text ?? ''),
    blankShare,
  );
  if (spans.length === 0) return [];

  const headerWords = spans.map(() => [] as string[]);
  for (let index = headerStart; index <= headerEnd; index += 1) {
    mergeCells(headerWords, assignWords(lines[index]?.text ?? '', spans));
  }
  const target = spans.map((_, column) => {
    if ((headerWords[column]?.length ?? 0) > 0) return column;
    const right = headerWords.findIndex((words, other) => other > column && words.length > 0);
    if (right !== -1) return right;
    return headerWords.findLastIndex((words, other) => other < column && words.length > 0);
  });
  const columns = [...new Set(target)].filter((column) => column !== -1);
  const cellsOf = (index: number) => {
    const cells = assignWords(lines[index]?.text ?? '', spans);
    return columns.map((column) =>
      cells.flatMap((words, other) => (target[other] === column ? words : [])),
    );
  };
  const header = columns.map((column) => headerWords[column] ?? []);

  if (numbered.length === 0) {
    numbered = body.filter((index) => (cellsOf(index)[0]?.length ?? 0) > 0);
  }
  const numberedSet = new Set(numbered);

  const isFlat = numbered.length / body.length >= FLAT_SHARE;
  const records = new Map<number, string[][]>(
    numbered.map((index) => [index, columns.map(() => [] as string[])]),
  );
  const ownerOf = (index: number): number | null => {
    if (numberedSet.has(index)) return index;
    const page = lines[index]?.page;
    const samePage = (candidate: number | undefined) =>
      candidate !== undefined && lines[candidate]?.page === page ? candidate : undefined;
    const before = samePage(numbered.filter((candidate) => candidate < index).at(-1));
    const after = samePage(numbered.find((candidate) => candidate > index));
    if (isFlat) return before ?? null;
    if (before === undefined) return after ?? null;
    if (after === undefined) return before;
    return index - before < after - index ? before : after;
  };
  for (const index of body) {
    const owner = ownerOf(index);
    const record = owner === null ? undefined : records.get(owner);
    if (record) mergeCells(record, cellsOf(index));
  }

  return [
    header.map((words) => words.join(' ')),
    ...numbered.map((index) => (records.get(index) ?? []).map((words) => words.join(' '))),
  ];
}

export async function readPdfText(path: string): Promise<string> {
  try {
    const { stdout } = await run('pdftotext', ['-layout', '-enc', 'UTF-8', path, '-'], {
      maxBuffer: 256 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    throw new WorkerError('pdf_invalid', `${path} is not a readable PDF`, { cause: error });
  }
}
