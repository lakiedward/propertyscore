import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { WorkerError } from '../lib/errors.ts';
import { parseSharedStrings, parseSheetRows, readXlsxRows } from './xlsx.ts';

const FIXTURE = fileURLToPath(new URL('./fixtures/siiir-sample.xlsx', import.meta.url));

describe('parseSharedStrings', () => {
  it('joins rich text runs and decodes entities', () => {
    const xml =
      '<sst><si><t>Școala &amp; Grădinița</t></si><si><r><t>Liceul </t></r><r><rPr/><t xml:space="preserve">&#8222;Iris&#8221;</t></r></si><si/></sst>';
    expect(parseSharedStrings(xml)).toEqual(['Școala & Grădinița', 'Liceul „Iris”', '']);
  });
});

describe('parseSheetRows', () => {
  it('places cells by column, reads shared, inline and number cells, and drops empty rows', () => {
    const xml = [
      '<sheetData>',
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1"><v>143469</v></c></row>',
      '<row r="2"><c r="A2" s="1"/></row>',
      '<row r="3" spans="1:3"/>',
      '<row r="4"><c r="B4" t="inlineStr"><is><t> Sibiu </t></is></c></row>',
      '</sheetData>',
    ].join('');
    expect(parseSheetRows(xml, ['0161102892'])).toEqual([
      ['0161102892', '', '143469'],
      ['', 'Sibiu'],
    ]);
  });

  it('rejects a reference to a missing shared string', () => {
    expect(() => parseSheetRows('<row><c r="A1" t="s"><v>4</v></c></row>', [])).toThrow(
      WorkerError,
    );
  });
});

describe('readXlsxRows', () => {
  it('reads the first sheet of a workbook through its shared strings', async () => {
    const rows = await readXlsxRows(FIXTURE);
    expect(rows[0]?.[0]).toBe('Generat la data: 08/10/2025 14:26');
    expect(rows[1]?.[11]).toBe('Cod SIIIR unitate');
    expect(rows).toHaveLength(8);
  });

  it('reports a file that is not a workbook', async () => {
    await expect(readXlsxRows(fileURLToPath(import.meta.url))).rejects.toMatchObject({
      code: 'xlsx_invalid',
    });
  });
});
