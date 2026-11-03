import { useTranslation } from 'react-i18next';
import { formatDate, formatPercent } from '@/i18n/format';
import { oneOf } from '@/lib/utils';
import { CATEGORY_KEYS } from '../online-report.utils';

const SOURCE_KEYS = [
  'osm',
  'gtfs',
  'noise',
  'cams',
  'eea_stations',
  'eea_air_map',
  'siiir',
  'cnas',
  'ms_upu',
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type ReportMethodProps = {
  sourceDates: Readonly<Record<string, string>>;
  weights: Readonly<Record<string, number>>;
  formulaLabel: string;
  period: string;
};

function formatSourceDate(value: string): string {
  return ISO_DATE.test(value)
    ? formatDate(value, { month: 'short', year: 'numeric', timeZone: 'UTC' })
    : value;
}

export function ReportMethod({ sourceDates, weights, formulaLabel, period }: ReportMethodProps) {
  const { t } = useTranslation('onlineReports');
  const sources = Object.entries(sourceDates).flatMap(([key, date]) => {
    const source = oneOf(SOURCE_KEYS, key);
    return source ? [{ source, date }] : [];
  });
  const totalWeight = CATEGORY_KEYS.reduce((sum, key) => sum + (weights[key] ?? 0), 0);

  return (
    <section aria-labelledby="report-method-title" className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-wide items-start gap-7 px-gutter py-10 lg:grid-cols-2 lg:py-14">
        <div className="flex flex-col gap-2.5">
          <span className="text-eyebrow font-extrabold text-info-ink-muted uppercase">
            {t('how.eyebrow')}
          </span>
          <h2 id="report-method-title" className="text-h3">
            {t('how.title')}
          </h2>
          <p className="text-body-sm text-muted-foreground">{t('how.body')}</p>
          <p className="text-caption text-muted-foreground">
            {t('how.formula', {
              formula: formulaLabel,
              period: formatDate(period, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
            })}
          </p>
        </div>
        <div className="grid gap-7 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 id="report-method-sources" className="text-label">
              {t('how.sources')}
            </h3>
            <ul aria-labelledby="report-method-sources" className="flex flex-col text-small">
              {sources.map(({ source, date }) => (
                <li
                  key={source}
                  className="flex justify-between gap-3 border-b border-border-subtle py-2.25"
                >
                  <span>{t(`source.${source}`)}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatSourceDate(date)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-label">{t('how.weights')}</h3>
            <ul className="flex flex-col text-small">
              {CATEGORY_KEYS.map((key) => (
                <li
                  key={key}
                  className="flex justify-between gap-3 border-b border-border-subtle py-2.25"
                >
                  <span>{t(`category.${key}`)}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatPercent(totalWeight > 0 ? (weights[key] ?? 0) / totalWeight : 0)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
