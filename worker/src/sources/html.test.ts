import { describe, expect, it } from 'vitest';

import { htmlTableRows } from './html.ts';

describe('htmlTableRows', () => {
  it('reads header and data cells, decodes entities and drops scripts and empty rows', () => {
    const html = [
      '<script>var row = "<tr><td>x</td></tr>";</script>',
      '<table><tr><th>Denumire</th><th>Adresa</th></tr>',
      '<tr><td>Farmacia <b>Ana</b> &amp; Co</td><td>Str. Mare nr.&nbsp;1<br>Sibiu</td></tr>',
      '<tr><td> </td><td></td></tr>',
      '<tr><td>&#350;coala</td><td>&#x219;os.</td></tr></table>',
    ].join('');
    expect(htmlTableRows(html)).toEqual([
      ['Denumire', 'Adresa'],
      ['Farmacia Ana & Co', 'Str. Mare nr. 1 Sibiu'],
      ['Şcoala', 'șos.'],
    ]);
  });
});
