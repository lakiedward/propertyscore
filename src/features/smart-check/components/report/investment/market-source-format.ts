import type { TFunction } from 'i18next';
import { formatDate } from '@/i18n/format';

export function marketSourceName(t: TFunction<'smartCheck'>, source: string): string {
  if (
    source === 'apartamente_org' ||
    source === 'apartamente_org_index' ||
    source === 'imospot_index'
  ) {
    return t(`report.chapters.investment.sources.names.${source}`);
  }
  return source;
}

export function marketPeriod(period: string): string {
  const month = /^\d{4}-(0[1-9]|1[0-2])(?:-01)?$/.test(period);
  return month
    ? formatDate(`${period.slice(0, 7)}-01`, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : period;
}
