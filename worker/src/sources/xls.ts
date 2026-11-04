import { spawn } from 'node:child_process';

import { WorkerError } from '../lib/errors.ts';
import { parseCsvRecords } from './csv.ts';

async function* firstSheet(path: string): AsyncGenerator<string> {
  const child = spawn('xls2csv', ['-d', 'utf-8', path], { stdio: ['ignore', 'pipe', 'ignore'] });
  const exited = new Promise<number | null>((resolve) => {
    child.once('error', () => resolve(-1));
    child.once('close', resolve);
  });
  child.stdout.setEncoding('utf8');
  try {
    for await (const chunk of child.stdout) {
      const text = chunk as string;
      const pageBreak = text.indexOf('\f');
      if (pageBreak !== -1) {
        yield text.slice(0, pageBreak);
        child.kill();
        return;
      }
      yield text;
    }
  } finally {
    if (child.exitCode === null) child.kill();
  }
  const code = await exited;
  if (code !== 0) throw new WorkerError('xls_invalid', `${path} is not a readable XLS workbook`);
}

export async function readXlsRows(path: string): Promise<string[][]> {
  const rows: string[][] = [];
  for await (const record of parseCsvRecords(firstSheet(path))) rows.push(record);
  return rows;
}
