export const REPORT_CHAPTERS = [
  'summary',
  'safety',
  'accessibility',
  'fifteenMinute',
  'green',
  'noise',
  'airIndustry',
  'seismic',
  'investment',
  'closing',
] as const;

export type ReportChapter = (typeof REPORT_CHAPTERS)[number];
