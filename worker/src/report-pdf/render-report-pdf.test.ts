import { readFile } from 'node:fs/promises';

import { describe, expect, it, vi } from 'vitest';

import { createLogger } from '../lib/logger.ts';
import { renderPdf } from '../pdf/render-pdf.ts';
import { renderReportDocument } from './render-report-pdf.ts';

vi.mock('../pdf/render-pdf.ts', () => ({ renderPdf: vi.fn() }));

describe('renderReportDocument', () => {
  it('renders either language from one saved input without changing its default locale', async () => {
    const fixture: unknown = JSON.parse(
      await readFile(new URL('./fixtures/example-report.json', import.meta.url), 'utf8'),
    );
    const saved = { ...(fixture as Record<string, unknown>), locale: 'en' };
    const logger = createLogger('error');
    vi.mocked(renderPdf).mockImplementation(({ html }) => Promise.resolve(Buffer.from(html)));

    const english = await renderReportDocument(saved, { logger, locale: 'en' });
    const romanian = await renderReportDocument(saved, { logger, locale: 'ro' });
    const defaultRender = await renderReportDocument(saved, { logger });

    expect(english.number).toBe(romanian.number);
    expect(english.pdf.toString()).toContain('<html lang="en">');
    expect(romanian.pdf.toString()).toContain('<html lang="ro">');
    expect(defaultRender.pdf.equals(english.pdf)).toBe(true);
  });
});
