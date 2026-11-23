import { CheckIcon, XIcon } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import type { ReadyReport } from '../../../../report.types';
import {
  SEISMIC_COLOR,
  SEISMIC_LEVEL_FILLS,
  SEISMIC_SCALE_BANDS,
  SEISMIC_TINT,
  citySlugLabelKey,
  scaleGroups,
  scalePosition,
} from '../../../../seismic.utils';

type Seismic = NonNullable<ReadyReport['result']['sections']['seismic']>;

type SeismicScaleCardProps = {
  seismic: Seismic;
  citySlug: string;
  cityName: string;
};

function acceleration(value: number): string {
  return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SeismicScaleCard({ seismic, citySlug, cityName }: SeismicScaleCardProps) {
  const { t } = useTranslation('smartCheck');
  const groups = scaleGroups(seismic, citySlug);
  const levelLabel = seismic.level
    ? t(`report.chapters.seismic.levels.${seismic.level}`, { defaultValue: seismic.level })
    : null;

  return (
    <section
      aria-label={t('report.chapters.seismic.scale.keyword')}
      className="grid min-w-0 gap-5 rounded-icon border border-border bg-card p-5 shadow-report-card w760:grid-cols-[auto_minmax(0,1fr)] w760:gap-x-10 w760:p-7"
    >
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-border-subtle pb-4 w760:flex-col w760:items-start w760:gap-2.5 w760:border-r w760:border-b-0 w760:pr-10 w760:pb-0">
        <span
          style={{ color: SEISMIC_COLOR }}
          className="w-full text-[13px] font-extrabold tracking-[0.06em] uppercase"
        >
          {t('report.chapters.seismic.scale.keyword')}
        </span>
        <span
          style={{ color: SEISMIC_COLOR }}
          className="text-[64px] leading-[0.95] font-extrabold tracking-[-0.04em] tabular-nums"
        >
          {acceleration(seismic.ag_g)}
          <small className="ml-1.5 text-[27px] font-bold tracking-normal text-muted-foreground">
            {t('report.chapters.seismic.scale.unit')}
          </small>
        </span>
        {levelLabel ? (
          <span
            style={{ background: SEISMIC_LEVEL_FILLS[seismic.level ?? ''] ?? SEISMIC_TINT }}
            className="inline-flex items-center rounded-full px-3 py-1.25 text-[14px] font-extrabold text-primary"
          >
            {levelLabel}
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        {groups.length > 1 ? (
          <>
            <p className="text-[clamp(18px,1.8vw,22px)] leading-tight font-bold tracking-[-0.01em]">
              {t('report.chapters.seismic.scale.title', {
                city: cityName,
                count: seismic.comparison.length - 1,
              })}
            </p>
            <div
              role="img"
              aria-label={t('report.chapters.seismic.scale.track')}
              className="relative mx-1.5 mt-1.5 h-24"
            >
              <div className="absolute inset-x-0 top-11 h-3 overflow-hidden rounded-md bg-muted">
                {SEISMIC_SCALE_BANDS.map((band) => (
                  <i
                    key={band.level}
                    style={{
                      left: `${String(band.from)}%`,
                      width: `${(band.to - band.from).toFixed(2)}%`,
                      background: SEISMIC_LEVEL_FILLS[band.level],
                    }}
                    className="absolute inset-y-0"
                  />
                ))}
              </div>
              {groups.map((group) => (
                <span
                  key={group.value}
                  style={{ left: `${scalePosition(group.value).toFixed(2)}%` }}
                  className="absolute top-0 flex w-max max-w-45 -translate-x-1/2 flex-col items-center"
                >
                  <b
                    style={group.isHere ? { background: SEISMIC_COLOR } : undefined}
                    className={cn(
                      'mb-1.5 text-[13px] font-extrabold tabular-nums',
                      group.isHere
                        ? 'mb-1 rounded-full px-2.25 py-0.75 text-white'
                        : 'hidden text-muted-foreground w760:block',
                    )}
                  >
                    {t('report.frame.tabs.seismicValue', { value: acceleration(group.value) })}
                  </b>
                  <i
                    aria-hidden="true"
                    style={
                      group.isHere
                        ? { background: SEISMIC_COLOR, borderColor: SEISMIC_COLOR }
                        : undefined
                    }
                    className={cn(
                      'absolute top-10 left-1/2 size-3.5 -translate-x-1/2 rounded-full border-[3px] border-[#B9A58E] bg-card',
                      group.isHere && 'shadow-[0_0_0_3px_var(--card)]',
                    )}
                  />
                  <em
                    className={cn(
                      'absolute top-16.5 w-max max-w-37.5 text-center text-[12px] leading-[1.3] not-italic',
                      group.isHere
                        ? 'font-bold text-foreground'
                        : 'hidden text-muted-foreground w760:block',
                    )}
                  >
                    {group.slugs
                      .map((slug) => t(citySlugLabelKey(slug), { defaultValue: slug }))
                      .join(', ')}
                  </em>
                </span>
              ))}
            </div>
            <ul className="mt-2.5 list-none p-0 w760:hidden">
              {groups.map((group) => (
                <li
                  key={group.value}
                  className={cn(
                    'flex items-baseline gap-3 border-t border-border-subtle py-1.75 text-[13.5px] text-muted-foreground',
                    group.isHere && 'font-extrabold',
                  )}
                  style={group.isHere ? { color: SEISMIC_COLOR } : undefined}
                >
                  <b className="min-w-14.5 font-extrabold tabular-nums">
                    {t('report.frame.tabs.seismicValue', { value: acceleration(group.value) })}
                  </b>
                  <span>
                    {group.slugs
                      .map((slug) => t(citySlugLabelKey(slug), { defaultValue: slug }))
                      .join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      <div className="flex flex-col gap-x-5 gap-y-2 border-t border-border-subtle pt-3.5 text-[13.5px] text-muted-foreground w760:col-span-2 w760:flex-row w760:flex-wrap [&_b]:font-bold [&_b]:text-foreground">
        <span className="flex items-start gap-1.75 leading-[1.4]">
          <CheckIcon aria-hidden className="mt-0.5 size-4 flex-none text-success" />
          <span>
            <Trans
              t={t}
              i18nKey="report.chapters.seismic.scale.included"
              values={{ code: seismic.code }}
              components={{ strong: <b /> }}
            />
          </span>
        </span>
        <span className="flex items-start gap-1.75 leading-[1.4]">
          <XIcon aria-hidden className="mt-0.5 size-4 flex-none text-(--ps-coral-600)" />
          <span>
            <Trans
              t={t}
              i18nKey="report.chapters.seismic.scale.excluded"
              components={{ strong: <b /> }}
            />
          </span>
        </span>
      </div>
    </section>
  );
}
