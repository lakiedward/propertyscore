import { useEffect, useRef, type KeyboardEvent, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { REPORT_HUES } from '@/components/report/report-hues';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { REPORT_TABS, REPORT_TAB_META, type ReportTab } from '../../report-chapter-meta';
import type { ReadyReport } from '../../report.types';

type ReportChapterNavProps = {
  report: ReadyReport;
  selected: ReportTab;
  panelId: string;
  onSelect: (tab: ReportTab) => void;
  ref?: Ref<HTMLDivElement>;
};

export function ReportChapterNav({
  report,
  selected,
  panelId,
  onSelect,
  ref,
}: ReportChapterNavProps) {
  const { t } = useTranslation('smartCheck');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !tab) return;
    list.scrollTo({
      left: tab.offsetLeft - list.clientWidth / 2 + tab.offsetWidth / 2,
      behavior: 'smooth',
    });
  }, [selected]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const index = (REPORT_TABS.indexOf(selected) + step + REPORT_TABS.length) % REPORT_TABS.length;
    const next = REPORT_TABS[index];
    if (!next) return;
    onSelect(next);
    document.getElementById(`report-tab-${next}`)?.focus({ preventScroll: true });
  };

  const tabValue = (tab: ReportTab): string => {
    const { result } = report;
    if (tab === 'summary') {
      return result.zone.score === null
        ? t('report.frame.tabs.noValue')
        : String(Math.round(result.zone.score));
    }
    if (tab === 'seismic') {
      const seismic = result.sections.seismic;
      return seismic
        ? t('report.frame.tabs.seismicValue', {
            value: formatNumber(seismic.ag_g, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          })
        : t('report.frame.tabs.noValue');
    }
    if (tab === 'investment') {
      const median = result.sections.investment?.sale?.median_eur_m2;
      return median === undefined
        ? t('report.frame.tabs.noValue')
        : t('report.frame.tabs.investmentValue', { value: formatNumber(Math.round(median)) });
    }
    const category = REPORT_TAB_META[tab].category;
    const score = category === null ? null : result.categories[category]?.score;
    return score === null || score === undefined
      ? t('report.frame.tabs.noValue')
      : String(Math.round(score));
  };

  return (
    <div
      ref={ref}
      className="sticky top-header z-90 border-b border-border-subtle bg-card/94 backdrop-blur-[10px] backdrop-saturate-140"
    >
      <div
        ref={listRef}
        role="tablist"
        aria-label={t('report.frame.tabs.label')}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="mx-auto scrollbar-none flex max-w-[1400px] items-center gap-2 overflow-x-auto px-4 py-2.5"
      >
        {REPORT_TABS.map((tab) => {
          const meta = REPORT_TAB_META[tab];
          const hue = REPORT_HUES[meta.hue];
          const isSelected = tab === selected;
          const Icon = meta.icon;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`report-tab-${tab}`}
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => {
                onSelect(tab);
              }}
              className={cn(
                'inline-flex min-h-9.5 flex-none items-center gap-1.75 rounded-full border py-0 pr-1.5 pl-3 text-[13.5px] font-bold whitespace-nowrap transition-colors duration-(--duration-fast) focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none w560:min-h-10 w560:text-small',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-brand hover:border-border-strong hover:bg-surface-highlight',
              )}
            >
              <Icon aria-hidden className={cn('size-4', isSelected ? 'text-cta' : hue.text)} />
              {t(`report.frame.tabs.names.${tab}`)}
              <span
                className={cn(
                  'inline-flex min-w-7.5 justify-center rounded-full px-2.25 py-0.5 text-meta font-extrabold tabular-nums',
                  hue.text,
                  isSelected ? 'bg-card' : hue.surface,
                )}
              >
                {tabValue(tab)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
