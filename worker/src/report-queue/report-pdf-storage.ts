import { WorkerError } from '../lib/errors.ts';

const REPORT_PDF_BUCKET = 'online-report-pdfs';

const UPLOAD_TIMEOUT_MS = 60_000;

export type ReportPdfStorage = {
  upload: (path: string, pdf: Buffer) => Promise<void>;
};

export type StoredReportPdfStorage = {
  replace: (path: string, pdf: Buffer) => Promise<void>;
};

export type ReportPdfStorageOptions = {
  supabaseUrl: string;
  secretKey: string;
  fetch?: typeof fetch;
};

function objectUrl(supabaseUrl: string, path: string): string {
  const base = supabaseUrl.replace(/\/+$/u, '');
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/${REPORT_PDF_BUCKET}/${encodedPath}`;
}

export function createReportPdfStorage(
  options: ReportPdfStorageOptions,
): ReportPdfStorage & StoredReportPdfStorage {
  const send = options.fetch ?? fetch;
  const credentials = {
    apikey: options.secretKey,
    authorization: `Bearer ${options.secretKey}`,
  };

  async function write(path: string, pdf: Buffer, method: 'POST' | 'PUT'): Promise<void> {
    const response = await send(objectUrl(options.supabaseUrl, path), {
      method,
      headers: {
        ...credentials,
        'content-type': 'application/pdf',
        ...(method === 'POST' ? { 'x-upsert': 'true' } : {}),
      },
      body: new Uint8Array(pdf),
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    }).catch((error: unknown) => {
      throw new WorkerError('report_pdf_upload_failed', 'The report PDF could not be uploaded', {
        cause: error,
      });
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new WorkerError(
        'report_pdf_upload_failed',
        `Storage refused the report PDF with HTTP ${String(response.status)}`,
        { cause: new Error(detail.slice(0, 500)) },
      );
    }
  }

  return {
    upload: (path, pdf) => write(path, pdf, 'POST'),
    async replace(path, pdf) {
      const existing = await send(objectUrl(options.supabaseUrl, path), {
        method: 'HEAD',
        headers: credentials,
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      }).catch((error: unknown) => {
        throw new WorkerError('report_pdf_lookup_failed', 'The stored PDF could not be checked', {
          cause: error,
        });
      });
      if (existing.status === 404) {
        throw new WorkerError('report_pdf_not_stored', 'The PDF object does not exist in Storage');
      }
      if (!existing.ok) {
        throw new WorkerError(
          'report_pdf_lookup_failed',
          `Storage refused to check the PDF with HTTP ${String(existing.status)}`,
        );
      }
      await write(path, pdf, 'PUT');
    },
  };
}
