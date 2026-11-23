import { WorkerError } from '../lib/errors.ts';

const REPORT_PDF_BUCKET = 'online-report-pdfs';

const UPLOAD_TIMEOUT_MS = 60_000;

export type ReportPdfStorage = {
  upload: (path: string, pdf: Buffer) => Promise<void>;
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

export function createReportPdfStorage(options: ReportPdfStorageOptions): ReportPdfStorage {
  const send = options.fetch ?? fetch;
  return {
    async upload(path, pdf) {
      const response = await send(objectUrl(options.supabaseUrl, path), {
        method: 'POST',
        headers: {
          apikey: options.secretKey,
          authorization: `Bearer ${options.secretKey}`,
          'content-type': 'application/pdf',
          'x-upsert': 'true',
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
    },
  };
}
