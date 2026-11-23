export const SHARE_EXPIRY_OPTIONS = ['7', '30', 'never'] as const;

export type ShareExpiryOption = (typeof SHARE_EXPIRY_OPTIONS)[number];

export function isShareExpiryOption(value: string): value is ShareExpiryOption {
  return (SHARE_EXPIRY_OPTIONS as readonly string[]).includes(value);
}

export function shareExpiryDays(option: ShareExpiryOption): number | null {
  return option === 'never' ? null : Number(option);
}

export function sharedReportUrl(siteUrl: string, reportId: string, token: string): string {
  const url = new URL(`/check/result/${encodeURIComponent(reportId)}`, siteUrl);
  url.searchParams.set('share', token);
  return url.toString();
}
