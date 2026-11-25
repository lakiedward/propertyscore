import { describe, expect, it, vi } from 'vitest';

import type { SqlQueries } from '../db/sql.ts';
import { readReadyReport, readStoredReportPdf } from './report-pdf.db.ts';

describe('report PDF input', () => {
  it.each(['ro', 'en'] as const)(
    'keeps the saved %s locale for generation and refresh',
    async (locale) => {
      const query = vi.fn().mockResolvedValue([
        {
          number: '17',
          address_text: 'Example address',
          latitude: 45,
          longitude: 21,
          status: 'ready',
          generated_at: new Date('2026-11-04T09:00:00Z'),
          locale,
          result: {},
          pdf_path: 'reports/example.pdf',
        },
      ]);
      const sql = query as unknown as SqlQueries;

      await expect(readReadyReport(sql, 'report-id')).resolves.toMatchObject({ locale });
      await expect(readStoredReportPdf(sql, 'report-id')).resolves.toMatchObject({
        path: 'reports/example.pdf',
        input: { locale },
      });
      expect(query).toHaveBeenCalledTimes(2);
      expect(query).toHaveBeenCalledWith(
        [expect.stringMatching(/\blocale\b/), expect.any(String)],
        'report-id',
      );
    },
  );
});
