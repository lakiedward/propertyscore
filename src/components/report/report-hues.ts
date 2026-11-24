export type ReportHue =
  | 'summary'
  | 'safety'
  | 'accessibility'
  | 'fifteenMinute'
  | 'green'
  | 'noise'
  | 'air'
  | 'industry'
  | 'education'
  | 'health'
  | 'context';

export type ReportHueClasses = {
  text: string;
  fill: string;
  surface: string;
  soft: string;
  hoverBorder: string;
};

export const REPORT_HUES: Readonly<Record<ReportHue, ReportHueClasses>> = {
  summary: {
    text: 'text-report-summary',
    fill: 'bg-report-summary',
    surface: 'bg-report-summary-surface',
    soft: 'bg-report-summary-soft',
    hoverBorder: 'hover:border-report-summary',
  },
  safety: {
    text: 'text-report-safety',
    fill: 'bg-report-safety',
    surface: 'bg-report-safety-surface',
    soft: 'bg-report-safety-soft',
    hoverBorder: 'hover:border-report-safety',
  },
  accessibility: {
    text: 'text-report-accessibility',
    fill: 'bg-report-accessibility',
    surface: 'bg-report-accessibility-surface',
    soft: 'bg-report-accessibility-soft',
    hoverBorder: 'hover:border-report-accessibility',
  },
  fifteenMinute: {
    text: 'text-report-fifteen-minute',
    fill: 'bg-report-fifteen-minute',
    surface: 'bg-report-fifteen-minute-surface',
    soft: 'bg-report-fifteen-minute-soft',
    hoverBorder: 'hover:border-report-fifteen-minute',
  },
  green: {
    text: 'text-report-green',
    fill: 'bg-report-green',
    surface: 'bg-report-green-surface',
    soft: 'bg-report-green-soft',
    hoverBorder: 'hover:border-report-green',
  },
  noise: {
    text: 'text-report-noise',
    fill: 'bg-report-noise',
    surface: 'bg-report-noise-surface',
    soft: 'bg-report-noise-soft',
    hoverBorder: 'hover:border-report-noise',
  },
  air: {
    text: 'text-report-air',
    fill: 'bg-report-air',
    surface: 'bg-report-air-surface',
    soft: 'bg-report-air-soft',
    hoverBorder: 'hover:border-report-air',
  },
  industry: {
    text: 'text-report-industry',
    fill: 'bg-report-industry',
    surface: 'bg-report-industry-surface',
    soft: 'bg-report-industry-soft',
    hoverBorder: 'hover:border-report-industry',
  },
  education: {
    text: 'text-report-education',
    fill: 'bg-report-education',
    surface: 'bg-report-education-surface',
    soft: 'bg-report-education-soft',
    hoverBorder: 'hover:border-report-education',
  },
  health: {
    text: 'text-report-health',
    fill: 'bg-report-health',
    surface: 'bg-report-health-surface',
    soft: 'bg-report-health-soft',
    hoverBorder: 'hover:border-report-health',
  },
  context: {
    text: 'text-report-context',
    fill: 'bg-report-context',
    surface: 'bg-report-context-surface',
    soft: 'bg-report-context-soft',
    hoverBorder: 'hover:border-report-context',
  },
};
