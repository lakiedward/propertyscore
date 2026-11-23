export type SharedReportPdfRequest = {
  reportId: string;
  token: string;
};

export type SharedReportPdfResponse = {
  url: string;
};

export type EdgeFunctionError = {
  error: string;
};
