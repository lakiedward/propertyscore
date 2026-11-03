import { WorkerError } from '../lib/errors.ts';

const BYTE_ORDER_MARK = '﻿';

type ParserState = {
  field: string;
  record: string[];
  isQuoted: boolean;
  isQuoteOpen: boolean;
  pendingQuote: boolean;
  isFirstChunk: boolean;
};

function pushField(state: ParserState): void {
  state.record.push(state.field);
  state.field = '';
  state.isQuoted = false;
}

export async function* parseCsvRecords(
  chunks: AsyncIterable<string> | Iterable<string>,
): AsyncGenerator<string[]> {
  const state: ParserState = {
    field: '',
    record: [],
    isQuoted: false,
    isQuoteOpen: false,
    pendingQuote: false,
    isFirstChunk: true,
  };
  for await (const rawChunk of chunks) {
    let chunk = rawChunk;
    if (state.isFirstChunk) {
      state.isFirstChunk = false;
      if (chunk.startsWith(BYTE_ORDER_MARK)) chunk = chunk.slice(1);
    }
    const records: string[][] = [];
    for (const char of chunk) {
      if (state.pendingQuote) {
        state.pendingQuote = false;
        if (char === '"') {
          state.field += '"';
          continue;
        }
        state.isQuoteOpen = false;
      }
      if (state.isQuoteOpen) {
        if (char === '"') state.pendingQuote = true;
        else state.field += char;
        continue;
      }
      if (char === '"' && state.field === '' && !state.isQuoted) {
        state.isQuoted = true;
        state.isQuoteOpen = true;
      } else if (char === ',') {
        pushField(state);
      } else if (char === '\n') {
        pushField(state);
        records.push(state.record);
        state.record = [];
      } else if (char !== '\r') {
        state.field += char;
      }
    }
    for (const record of records) {
      if (record.length > 1 || record[0] !== '') yield record;
    }
  }
  if (state.isQuoteOpen && !state.pendingQuote) {
    throw new WorkerError('csv_unterminated_quote', 'The CSV ends inside a quoted field');
  }
  if (state.field !== '' || state.record.length > 0) {
    pushField(state);
    yield state.record;
  }
}

export async function* readCsvObjects<Column extends string>(
  chunks: AsyncIterable<string> | Iterable<string>,
  columns: readonly Column[],
  source: string,
): AsyncGenerator<Record<Column, string>> {
  let positions: Map<Column, number> | null = null;
  for await (const record of parseCsvRecords(chunks)) {
    if (!positions) {
      const header = record.map((name) => name.trim());
      const missing = columns.filter((column) => !header.includes(column));
      if (missing.length > 0) {
        throw new WorkerError(
          'source_columns_changed',
          `${source} is missing the columns: ${missing.join(', ')}`,
        );
      }
      positions = new Map(columns.map((column) => [column, header.indexOf(column)]));
      continue;
    }
    const row = {} as Record<Column, string>;
    for (const [column, position] of positions) row[column] = (record[position] ?? '').trim();
    yield row;
  }
}
