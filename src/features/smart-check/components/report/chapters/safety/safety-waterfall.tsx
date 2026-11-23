import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ArrowUpIcon, InfoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatDistanceM,
  safetyTypeMeta,
  type SafetyBreakdown,
  type SafetyRow,
  type SafetyWhen,
} from '../../../../safety.utils';

type SafetyWaterfallProps = {
  breakdown: SafetyBreakdown;
  when: SafetyWhen;
  focusedType: string | null;
  onFocusType: (type: string) => void;
};

function rowSigned(points: number): string {
  return `${points < 0 ? '−' : '+'}${String(Math.abs(points))}`;
}

type WaterfallRowProps = {
  row: SafetyRow;
  isFocused: boolean;
  onFocusType: (type: string) => void;
};

function WaterfallRow({ row, isFocused, onFocusType }: WaterfallRowProps) {
  const { t } = useTranslation('smartCheck');
  const meta = safetyTypeMeta(row.type);
  const Icon = meta.icon;
  const nearest = row.nearestM === null ? null : formatDistanceM(row.nearestM);
  let detail: string;
  if (nearest !== null && row.count > 0) {
    detail = t('report.chapters.safety.waterfall.detailBoth', {
      count: row.count,
      distance: nearest,
    });
  } else if (nearest !== null) {
    detail = t('report.chapters.safety.waterfall.detailNearest', { distance: nearest });
  } else {
    detail = t('report.chapters.safety.waterfall.detailCount', { count: row.count });
  }
  return (
    <li>
      <button
        type="button"
        aria-pressed={isFocused}
        onClick={() => {
          onFocusType(row.type);
        }}
        style={{ '--c': `var(${meta.colorVar})` } as CSSProperties}
        className={cn(
          'grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[10px] p-2 text-left transition-colors duration-(--duration-fast) hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none',
          isFocused &&
            'bg-[color-mix(in_srgb,var(--c)_9%,var(--card))] shadow-[inset_3px_0_0_var(--c)]',
        )}
      >
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-[9px] bg-[color-mix(in_srgb,var(--c)_13%,var(--card))] text-(--c)"
        >
          <Icon className="size-4.25" />
        </span>
        <span className="min-w-0">
          <b className="block text-[14px] leading-[1.25] font-bold">
            {t(`report.chapters.safety.types.${row.type}`, {
              defaultValue: t('report.chapters.safety.types.other'),
            })}
          </b>
          <small className="mt-px block text-[12px] leading-[1.35] text-muted-foreground">
            {detail}
          </small>
        </span>
        <span
          className={cn(
            'text-[15px] font-extrabold tabular-nums',
            row.points < 0 ? 'text-[color:var(--ps-coral-600)]' : 'text-success',
          )}
        >
          {rowSigned(row.points)}
        </span>
      </button>
    </li>
  );
}

export function SafetyWaterfall({
  breakdown,
  when,
  focusedType,
  onFocusType,
}: SafetyWaterfallProps) {
  const { t } = useTranslation('smartCheck');
  const { start, score, raises, lowers, up, down, kept, farTypes } = breakdown;
  const remainder = Math.max(0, 100 - start - kept - down);
  const farList = farTypes
    .map(({ type, distanceM }) => {
      const label = t(`report.chapters.safety.types.${type}`, {
        defaultValue: t('report.chapters.safety.types.other'),
      }).toLocaleLowerCase();
      return distanceM === null ? label : `${label} (${formatDistanceM(distanceM)})`;
    })
    .join(', ');

  const renderColumn = (tone: 'up' | 'down', rows: readonly SafetyRow[]) => (
    <div className="min-w-0">
      <h4
        className={cn(
          'mt-1 mb-1.5 flex items-center gap-1.5 text-[11.5px] font-extrabold tracking-[0.06em] uppercase',
          tone === 'up' ? 'text-success' : 'text-[color:var(--ps-coral-600)]',
        )}
      >
        <ArrowUpIcon aria-hidden className={cn('size-3.5', tone === 'down' && 'rotate-180')} />
        {t(
          tone === 'up'
            ? 'report.chapters.safety.waterfall.raises'
            : 'report.chapters.safety.waterfall.lowers',
        )}
      </h4>
      {rows.length === 0 ? (
        <p className="p-2 text-[12.5px] text-muted-foreground">
          {t('report.chapters.safety.waterfall.empty')}
        </p>
      ) : (
        <ul>
          {rows.map((row) => (
            <WaterfallRow
              key={row.type}
              row={row}
              isFocused={focusedType === row.type}
              onFocusType={onFocusType}
            />
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div>
      <h3 className="text-[18px] font-extrabold tracking-[-0.01em]">
        {t(
          when === 'day'
            ? 'report.chapters.safety.waterfall.titleDay'
            : 'report.chapters.safety.waterfall.titleNight',
          { score },
        )}
      </h3>
      <div aria-hidden="true" className="mt-3.5 flex h-3.5 overflow-hidden rounded-full bg-muted">
        <i style={{ flex: start }} className="block min-w-0 bg-(--ps-band-mid)" />
        <i style={{ flex: kept }} className="block min-w-0 bg-report-safety" />
        <i
          style={{ flex: down }}
          className="block min-w-0 bg-[repeating-linear-gradient(135deg,var(--ps-coral-300)_0_5px,var(--ps-coral-100)_5px_10px)]"
        />
        <i style={{ flex: remainder }} className="block min-w-0" />
      </div>
      <p className="mt-2 text-[13.5px] text-muted-foreground">
        <Trans
          t={t}
          i18nKey="report.chapters.safety.waterfall.equation"
          values={{ start, up, down, score }}
          components={{
            strong: <b className="font-bold text-foreground tabular-nums" />,
            up: <b className="font-bold text-success tabular-nums" />,
            down: <b className="font-bold text-[color:var(--ps-coral-600)] tabular-nums" />,
          }}
        />
      </p>
      <div className="mt-3.5 grid gap-4 w560:grid-cols-2 w760:gap-7">
        {renderColumn('up', raises)}
        {renderColumn('down', lowers)}
      </div>
      {farList ? (
        <p className="mt-3 flex gap-2 rounded-[10px] bg-muted px-3 py-2.5 text-[13px] leading-[1.45] text-muted-foreground">
          <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span className="[&_b]:text-foreground">
            <Trans
              t={t}
              i18nKey="report.chapters.safety.waterfall.far"
              values={{ list: farList }}
              components={{ strong: <b /> }}
            />
          </span>
        </p>
      ) : null}
      <p className="mt-2.5 text-[12.5px] text-muted-foreground">
        {t('report.chapters.safety.waterfall.hint')}
      </p>
    </div>
  );
}
