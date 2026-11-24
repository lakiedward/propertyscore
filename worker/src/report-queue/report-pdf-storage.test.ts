import { describe, expect, it, vi } from 'vitest';

import { createReportPdfStorage } from './report-pdf-storage.ts';

describe('createReportPdfStorage', () => {
  it('uploads the PDF into the private bucket with the secret key, replacing an earlier file', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(new Response('{}', { status: 200 })),
    );
    const storage = createReportPdfStorage({
      supabaseUrl: 'https://example.supabase.co/',
      secretKey: 'sb_secret_test',
      fetch,
    });

    await storage.upload('owner-id/report-id.pdf', Buffer.from('%PDF-1.7'));

    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe(
      'https://example.supabase.co/storage/v1/object/online-report-pdfs/owner-id/report-id.pdf',
    );
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      apikey: 'sb_secret_test',
      authorization: 'Bearer sb_secret_test',
      'content-type': 'application/pdf',
      'x-upsert': 'true',
    });
  });

  it('fails with a code when Storage refuses the file', async () => {
    const storage = createReportPdfStorage({
      supabaseUrl: 'https://example.supabase.co',
      secretKey: 'sb_secret_test',
      fetch: () => Promise.resolve(new Response('{"error":"Payload too large"}', { status: 413 })),
    });

    await expect(storage.upload('a/b.pdf', Buffer.from('x'))).rejects.toMatchObject({
      code: 'report_pdf_upload_failed',
    });
  });

  it('fails with a code when Storage cannot be reached', async () => {
    const storage = createReportPdfStorage({
      supabaseUrl: 'https://example.supabase.co',
      secretKey: 'sb_secret_test',
      fetch: () => Promise.reject(new TypeError('fetch failed')),
    });

    await expect(storage.upload('a/b.pdf', Buffer.from('x'))).rejects.toMatchObject({
      code: 'report_pdf_upload_failed',
    });
  });
});
