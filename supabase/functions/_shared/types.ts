export type ReportPdfRequest = {
  reportId: string;
  locale: 'ro' | 'en';
  token?: string;
};

export type ReportPdfResponse =
  { status: 'ready'; downloadPath: string } | { status: 'pending' } | { status: 'unavailable' };

export type EdgeFunctionError = {
  error: string;
};
