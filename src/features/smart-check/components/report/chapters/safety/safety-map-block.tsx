import { MoonIcon, SunIcon } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatDate } from '@/i18n/format';
import type { ReadyReport } from '../../../../report.types';
import { heatGradient } from '../../../../safety-heat';
import {
  landmarkTypes,
  safetyBreakdown,
  safetyTypeMeta,
  type SafetyWhen,
} from '../../../../safety.utils';
import { SafetyMap } from './safety-map';
import { SafetyWaterfall } from './safety-waterfall';

const DATE_FORMAT = { day: 'numeric', month: 'short', year: 'numeric' } as const;

type SafetyMapBlockProps = {
  report: ReadyReport;
};

const CHIP_BASE =
  'inline-flex min-h-7 items-center gap-1.5 rounded-full border border-border bg-card py-0 pr-2.25 pl-1.25 text-[12px] font-bold text-foreground transition-colors duration-(--duration-fast) hover:border-border-strong focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none aria-pressed:bg-card [&[aria-pressed=false]]:border-transparent [&[aria-pressed=false]]:bg-muted [&[aria-pressed=false]]:text-muted-foreground';

export function SafetyMapBlock({ report }: SafetyMapBlockProps) {
  const { t } = useTranslation('smartCheck');
  const [when, setWhen] = useState<SafetyWhen>('day');
  const [hiddenTypes, setHiddenTypes] = useState<ReadonlySet<string>>(new Set());
  const [isHeatVisible, setIsHeatVisible] = useState(true);
  const [focusedType, setFocusedType] = useState<string | null>(null);
  const safety = report.result.sections.safety;
  if (!safety) return null;

  const breakdown = safetyBreakdown(safety, when);
  const types = landmarkTypes(safety.landmarks);
  const hasHeat = (safety.heat?.cells.length ?? 0) > 0;
  const osmDate = report.result.snapshot.source_dates.osm;

  const toggleType = (type: string) => {
    setHiddenTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
    setFocusedType((current) => (current === type ? null : current));
  };

  const focusType = (type: string) => {
    setFocusedType((current) => (current === type ? null : type));
    setHiddenTypes((current) => {
      if (!current.has(type)) return current;
      const next = new Set(current);
      next.delete(type);
      return next;
    });
  };

  const moments = [
    { key: 'day', icon: SunIcon, score: Math.round(safety.address.day.score) },
    { key: 'night', icon: MoonIcon, score: Math.round(safety.address.night.score) },
  ] as const;

  return (
    <section
      aria-label={t('report.chapters.safety.map.label')}
      className="min-w-0 w760:rounded-2xl w760:border w760:border-border w760:bg-card w760:p-5 w760:shadow-report-panel"
    >
      <div className="relative h-[600px] overflow-hidden rounded-xl border border-border bg-report-map-land w560:h-[520px] w1059:h-[620px]">
        <SafetyMap
          report={report}
          when={when}
          landmarks={safety.landmarks}
          hiddenTypes={hiddenTypes}
          focusedType={focusedType}
          isHeatVisible={isHeatVisible}
        />
        <div
          role="radiogroup"
          aria-label={t('report.chapters.safety.map.moment')}
          className="absolute top-2.5 left-2.5 z-3 inline-flex gap-0.5 rounded-[10px] border border-border bg-card/96 p-0.75 shadow-report-label"
        >
          {moments.map(({ key, icon: Icon, score }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={when === key}
              onClick={() => {
                setWhen(key);
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-bold text-muted-foreground transition-colors duration-(--duration-fast) focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none w560:px-3 w560:text-[14px]',
                when === key && 'bg-primary text-primary-foreground',
              )}
            >
              <Icon aria-hidden className="size-4" />
              {t(`report.chapters.safety.map.${key}`)}
              <b
                className={cn('ml-0.5 tabular-nums', when === key ? 'text-cta' : 'text-foreground')}
              >
                {score}
              </b>
            </button>
          ))}
        </div>
        <div className="absolute inset-x-2.5 bottom-7 z-3 grid gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-report-float w560:p-2.5">
          {hasHeat ? (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-bold text-muted-foreground">
              <b className="mr-0.5 text-[12.5px] text-foreground">
                {t('report.chapters.safety.map.heat')}
              </b>
              <span>{t('report.chapters.safety.map.legendLess')}</span>
              <i
                aria-hidden="true"
                style={{ background: heatGradient() }}
                className="inline-block h-2.5 w-23 shrink-0 rounded-full"
              />
              <span>{t('report.chapters.safety.map.legendMore')}</span>
            </span>
          ) : null}
          <div
            role="group"
            aria-label={t('report.chapters.safety.map.elements')}
            className="flex flex-wrap gap-1.5"
          >
            {hasHeat ? (
              <button
                type="button"
                aria-pressed={isHeatVisible}
                onClick={() => {
                  setIsHeatVisible((current) => !current);
                }}
                className={cn(CHIP_BASE, 'shrink-0 pl-2.5')}
              >
                <i
                  aria-hidden="true"
                  style={{ background: heatGradient() }}
                  className={cn(
                    'inline-block h-2 w-5.5 rounded-full',
                    !isHeatVisible && 'opacity-50 grayscale',
                  )}
                />
                {t('report.chapters.safety.map.heat')}
              </button>
            ) : null}
            {types.map((type) => {
              const meta = safetyTypeMeta(type);
              const Icon = meta.icon;
              const isOn = !hiddenTypes.has(type);
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => {
                    toggleType(type);
                  }}
                  style={{ '--c': `var(${meta.colorVar})` } as CSSProperties}
                  className={cn(
                    CHIP_BASE,
                    'shrink-0',
                    focusedType === type && 'border-(--c) shadow-[0_0_0_2px_var(--c)]',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid size-4.75 place-items-center rounded-full text-card',
                      isOn ? 'bg-(--c)' : 'bg-(--ps-grey-300)',
                    )}
                  >
                    <Icon className="size-2.75" />
                  </span>
                  {t(`report.chapters.safety.types.${type}`, {
                    defaultValue: t('report.chapters.safety.types.other'),
                  })}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-4.5 rounded-xl border border-border bg-card p-4 w760:mt-4.5 w760:rounded-none w760:border-0 w760:bg-transparent w760:p-1 w760:pb-0">
        <SafetyWaterfall
          breakdown={breakdown}
          when={when}
          focusedType={focusedType}
          onFocusType={focusType}
        />
      </div>
      <p className="mt-2.5 px-1 text-[12.5px] leading-[1.45] text-muted-foreground">
        {osmDate
          ? t('report.chapters.safety.map.source', {
              date: formatDate(osmDate, DATE_FORMAT),
            })
          : t('report.chapters.safety.map.sourceNoDate')}
      </p>
    </section>
  );
}
