import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';

const REPORT_PDFS_BUCKET = 'online-report-pdfs';
const PDF_URL_SECONDS = 60;

function reportPdfFileName(reportNumber: number): string {
  return `PropertyScore-SmartCheck-${String(reportNumber)}.pdf`;
}

export async function getReportPdfUrl(pdfPath: string, reportNumber: number) {
  const { data, error } = await supabase.storage
    .from(REPORT_PDFS_BUCKET)
    .createSignedUrl(pdfPath, PDF_URL_SECONDS, { download: reportPdfFileName(reportNumber) });
  if (error) throw toAppError(error);
  return data.signedUrl;
}
