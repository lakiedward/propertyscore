import { PhoneIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { formatDistanceM, walkMinutes, type HelpRow } from '../../../../safety.utils';

const BAR_HEADROOM = 1.08;
const MIN_BAR_PERCENT = 2;

type SafetyHelpCardProps = {
  rows: readonly HelpRow[];
};

export function SafetyHelpCard({ rows }: SafetyHelpCardProps) {
  const { t } = useTranslation('smartCheck');
  if (rows.length === 0) return null;
  const longest = Math.max(...rows.map((row) => row.metres ?? 0), 1) * BAR_HEADROOM;

  return (
    <section
      aria-labelledby="safety-help-title"
      className="min-w-0 rounded-icon border border-border bg-card p-5 shadow-report-card"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
        <div>
          <p className="text-meta font-extrabold tracking-label text-muted-foreground uppercase">
            {t('report.chapters.safety.help.eyebrow')}
          </p>
          <h3 id="safety-help-title" className="mt-1 text-[18px] font-extrabold tracking-[-0.01em]">
            {t('report.chapters.safety.help.title')}
          </h3>
        </div>
        <a
          href="tel:112"
          aria-label={t('report.chapters.safety.help.emergencyLabel')}
          className="inline-flex items-center gap-2 rounded-full bg-(--ps-berry-50) px-3.5 py-2 text-[14px] font-bold text-(--ps-berry-600) no-underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
        >
          <PhoneIcon aria-hidden className="size-4" />
          <span>
            <Trans
              t={t}
              i18nKey="report.chapters.safety.help.emergency"
              components={{ strong: <b className="font-extrabold" /> }}
            />
          </span>
        </a>
      </div>
      <ol aria-label={t('report.chapters.safety.help.listLabel')} className="mt-4 grid">
        {rows.map((row) => {
          const Icon = row.icon;
          const value =
            row.metres === null
              ? t('report.chapters.safety.help.minutes', { count: Math.round(row.minutes ?? 0) })
              : formatDistanceM(row.metres);
          const detail =
            row.mode === 'car'
              ? t('report.chapters.safety.help.car')
              : t('report.chapters.safety.help.walk', {
                  minutes: t('report.chapters.safety.help.minutes', {
                    count:
                      row.metres === null ? Math.round(row.minutes ?? 0) : walkMinutes(row.metres),
                  }),
                });
          return (
            <li
              key={row.key}
              style={{ '--c': `var(${row.colorVar})` } as CSSProperties}
              className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-border-subtle py-3 first:border-t-0 w760:grid-cols-[40px_minmax(0,1.1fr)_minmax(0,1fr)_112px] w760:gap-x-3.5"
            >
              <span
                aria-hidden="true"
                className="row-span-2 grid size-9 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--c)_12%,var(--card))] text-(--c) w760:row-span-1 w760:size-10"
              >
                <Icon className="size-5" />
              </span>
              <span className="flex min-w-0 flex-col">
                <b className="text-[15.5px] font-bold">
                  {t(`report.chapters.safety.help.${row.titleKey}`, {
                    defaultValue: t('report.chapters.safety.types.other'),
                  })}
                </b>
                {row.name ? (
                  <small className="truncate text-[13px] text-muted-foreground">{row.name}</small>
                ) : null}
              </span>
              <span
                aria-hidden="true"
                className="col-span-2 col-start-2 row-start-2 h-2 overflow-hidden rounded-full bg-muted w760:col-span-1 w760:col-start-auto w760:row-start-auto"
              >
                {row.metres === null ? null : (
                  <i
                    style={{
                      width: `${String(Math.max(MIN_BAR_PERCENT, (row.metres / longest) * 100))}%`,
                    }}
                    className="block h-full rounded-full bg-(--c)"
                  />
                )}
              </span>
              <span className="col-start-3 row-start-1 flex flex-col items-end text-right w760:col-start-auto w760:row-start-auto">
                <b className="text-[17px] font-extrabold tabular-nums">{value}</b>
                <small className="text-[12.5px] text-muted-foreground">{detail}</small>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
