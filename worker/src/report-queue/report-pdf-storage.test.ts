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

  it('checks the exact object before sending the replacement to the same path', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(null));
    const storage = createReportPdfStorage({
      supabaseUrl: 'https://example.supabase.co',
      secretKey: 'sb_secret_test',
      fetch,
    });

    await storage.replace('owner-id/report-id.pdf', Buffer.from('%PDF-1.7'));

    const url =
      'https://example.supabase.co/storage/v1/object/online-report-pdfs/owner-id/report-id.pdf';
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, url, expect.objectContaining({ method: 'HEAD' }));
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      url,
      expect.objectContaining({ method: 'PUT', body: Uint8Array.from(Buffer.from('%PDF-1.7')) }),
    );
  });

  it.each([
    [404, 'report_pdf_not_stored'],
    [503, 'report_pdf_lookup_failed'],
  ])('does not write a PDF when checking Storage returns HTTP %i', async (status, code) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(null, { status }));
    const storage = createReportPdfStorage({
      supabaseUrl: 'https://example.supabase.co',
      secretKey: 'sb_secret_test',
      fetch,
    });

    await expect(
      storage.replace('owner-id/report-id.pdf', Buffer.from('pdf')),
    ).rejects.toMatchObject({ code });
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('/owner-id/report-id.pdf'),
      expect.objectContaining({ method: 'HEAD' }),
    );
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
