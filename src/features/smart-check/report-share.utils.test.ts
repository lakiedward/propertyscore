import { describe, expect, it } from 'vitest';
import { isShareExpiryOption, sharedReportUrl, shareExpiryDays } from './report-share.utils';

const REPORT_ID = '5f7d3b8c-6f43-4f6e-9d55-2f1c0b6a9e11';
const TOKEN = 'a'.repeat(48);

describe('sharedReportUrl', () => {
  it('opens the report page with the token as the share parameter', () => {
    expect(sharedReportUrl('https://propertyscore.ro', REPORT_ID, TOKEN)).toBe(
      `https://propertyscore.ro/check/result/${REPORT_ID}?share=${TOKEN}`,
    );
  });
});

describe('shareExpiryDays', () => {
  it('turns the chosen validity into days, or none for a link without expiry', () => {
    expect(shareExpiryDays('7')).toBe(7);
    expect(shareExpiryDays('30')).toBe(30);
    expect(shareExpiryDays('never')).toBeNull();
  });
});

describe('isShareExpiryOption', () => {
  it('accepts only the offered validities', () => {
    expect(isShareExpiryOption('30')).toBe(true);
    expect(isShareExpiryOption('365')).toBe(false);
    expect(isShareExpiryOption('')).toBe(false);
  });
});
