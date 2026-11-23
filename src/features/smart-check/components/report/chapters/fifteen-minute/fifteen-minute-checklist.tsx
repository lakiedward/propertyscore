import { CheckIcon, XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  WALK_LIMIT_MIN,
  checklistRows,
  type ChecklistRow,
  type FifteenMinuteSection,
} from '../../../../fifteen-minute.utils';

type FifteenMinuteChecklistProps = {
  section: FifteenMinuteSection;
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

const ROW_BASE =
  'flex w-full items-center gap-3 rounded-lg border-t border-border-subtle px-2 py-2.25 text-left';

function RowBody({ row, label }: { row: ChecklistRow; label: string }) {
  const { t } = useTranslation('smartCheck');
  const limit = String(WALK_LIMIT_MIN);
  const choice =
    row.count === 1
      ? t('report.chapters.fifteenMinute.checklist.only', { limit })
      : t('report.chapters.fifteenMinute.checklist.count', { count: row.count, limit });
  const detail = row.isReached
    ? [row.nearest?.name, choice].filter(Boolean).join(' · ')
    : t('report.chapters.fifteenMinute.checklist.farther', { limit });
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'grid size-6.5 shrink-0 place-items-center rounded-full',
          row.isReached
            ? 'bg-report-fifteen-minute text-primary-foreground'
            : 'bg-muted text-(--ps-grey-300)',
        )}
      >
        {row.isReached ? <CheckIcon className="size-3.75" /> : <XIcon className="size-3.75" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <b
          className={cn(
            'text-[14.5px] leading-[1.55] font-bold',
            !row.isReached && 'text-muted-foreground',
          )}
        >
          {label}
        </b>
        <small className="truncate text-[12.5px] leading-[1.55] text-muted-foreground">
          {detail}
        </small>
      </span>
      {row.minutes === null ? null : (
        <span className="text-[12.5px] whitespace-nowrap text-muted-foreground">
          <b className="text-[18px] font-extrabold text-foreground tabular-nums">{row.minutes}</b>{' '}
          {t('report.chapters.fifteenMinute.checklist.min')}
        </span>
      )}
    </>
  );
}

export function FifteenMinuteChecklist({
  section,
  selectedKey,
  onSelect,
}: FifteenMinuteChecklistProps) {
  const { t } = useTranslation('smartCheck');
  const share = section.total === 0 ? 0 : (section.covered / section.total) * 100;

  return (
    <div>
      <p className="text-meta font-extrabold tracking-label text-muted-foreground uppercase">
        {t('report.chapters.fifteenMinute.checklist.eyebrow')}
      </p>
      <h3 className="mt-1 text-[18.72px] leading-[1.55] font-bold">
        {t('report.chapters.fifteenMinute.checklist.title', {
          covered: section.covered,
          total: section.total,
          limit: WALK_LIMIT_MIN,
        })}
      </h3>
      <div aria-hidden="true" className="mt-3.5 mb-2.5 h-2.5 overflow-hidden rounded-full bg-muted">
        <i
          style={{ width: `${share}%` }}
          className="block h-full rounded-full bg-report-fifteen-minute transition-[width] duration-(--duration-base)"
        />
      </div>
      <ul>
        {checklistRows(section).map((row) => {
          const label = t(`report.chapters.fifteenMinute.categories.${row.key}`, {
            defaultValue: t('report.chapters.fifteenMinute.categories.other'),
          });
          const isSelected = selectedKey === row.key;
          return (
            <li key={row.key}>
              {row.nearest && row.isReached ? (
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    onSelect(row.key);
                  }}
                  className={cn(
                    ROW_BASE,
                    'cursor-pointer transition-colors duration-(--duration-fast) hover:bg-report-fifteen-minute-soft focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none',
                    isSelected && 'bg-report-fifteen-minute-soft',
                  )}
                >
                  <RowBody row={row} label={label} />
                </button>
              ) : (
                <div className={ROW_BASE}>
                  <RowBody row={row} label={label} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
