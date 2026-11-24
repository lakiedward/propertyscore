import {
  GraduationCapIcon,
  HeartPulseIcon,
  LandmarkIcon,
  MapPinIcon,
  PlaneIcon,
  SchoolIcon,
  ShoppingBagIcon,
  TrainFrontIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { DestinationRow as Row, TripLeg } from '../../../accessibility.utils';
import { formatDistanceM } from '../../../safety.utils';
import { LineChip } from './line-chip';

const KIND_ICONS: Readonly<Record<string, LucideIcon>> = {
  station: TrainFrontIcon,
  hospital: HeartPulseIcon,
  mall: ShoppingBagIcon,
  airport: PlaneIcon,
  university: GraduationCapIcon,
  center: LandmarkIcon,
  high_school: SchoolIcon,
  faculty: GraduationCapIcon,
};

const LEG_CLASSES: Readonly<Record<TripLeg['kind'], string>> = {
  walk: 'bg-muted-foreground',
  wait: 'bg-warning-fill',
  ride: '',
};

const MIN_LEG_FLEX = 2;

type DestinationRowProps = {
  row: Row;
  isPick?: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

export function DestinationRow({ row, isPick = false, isSelected, onSelect }: DestinationRowProps) {
  const { t, i18n } = useTranslation('smartCheck');
  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'ro';
  const Icon = KIND_ICONS[row.kind] ?? MapPinIcon;
  const name = row.label[language];

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={t('report.chapters.accessibility.rowLabel', { name, minutes: row.minutes })}
      onClick={() => {
        onSelect(row.id);
      }}
      className={cn(
        'grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-thumb border-t border-border-subtle px-1 py-3 text-left transition-colors first:border-t-transparent hover:bg-report-summary-soft focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none w760:grid-cols-[44px_minmax(0,1.1fr)_minmax(0,1fr)_92px] w760:gap-4 w760:px-2',
      )}
      style={
        isSelected
          ? {
              backgroundColor: `color-mix(in srgb, var(${row.swatch.token}) 8%, var(--card))`,
              boxShadow: `inset 3px 0 0 var(${row.swatch.token})`,
            }
          : undefined
      }
    >
      <span
        aria-hidden="true"
        className="row-span-2 grid size-10 place-items-center rounded-icon w760:row-span-1 w760:size-11"
        style={{
          backgroundColor: `color-mix(in srgb, var(${row.swatch.token}) 13%, var(--card))`,
          color: `var(${row.swatch.token})`,
        }}
      >
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.75">
        <b className="text-[16px] leading-snug font-bold">
          {name}
          {row.tag ? (
            <em className="ml-1 rounded-md bg-report-context-surface px-1.5 py-0.5 align-[1px] text-[11.5px] font-extrabold text-muted-foreground not-italic">
              {row.tag}
            </em>
          ) : null}
        </b>
        <small className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
          {row.isWalkOnly && row.walkDistanceM !== null && isPick ? (
            t('report.chapters.accessibility.walkDistance', {
              distance: formatDistanceM(row.walkDistanceM),
            })
          ) : row.isWalkOnly ? (
            t('report.chapters.accessibility.walkFaster', { minutes: row.minutes })
          ) : (
            <>
              {row.line ? <LineChip reference={row.line.ref} colour={row.line.colour} /> : null}
              {row.boardingStop ? (
                <span>
                  {t('report.chapters.accessibility.fromStop', { stop: row.boardingStop })}
                </span>
              ) : null}
            </>
          )}
        </small>
      </span>
      <span className="col-span-2 flex h-5 gap-0.5 overflow-hidden rounded-md w760:col-span-1 w760:col-start-3 w760:row-start-1">
        {row.legs.map((leg) => (
          <i
            key={leg.kind}
            title={t(`report.chapters.accessibility.legs.${leg.kind}`, { minutes: leg.minutes })}
            className={cn(
              'grid min-w-0 place-content-center overflow-hidden text-[0px] font-extrabold text-on-inverse not-italic w760:text-[10.5px]',
              LEG_CLASSES[leg.kind],
              leg.kind === 'ride' && row.swatch.fill,
            )}
            style={{ flex: Math.max(leg.minutes, MIN_LEG_FLEX) }}
          >
            {row.isWalkOnly
              ? t('report.chapters.accessibility.legs.walk', { minutes: leg.minutes })
              : leg.minutes}
          </i>
        ))}
      </span>
      <span className="col-start-3 row-start-1 text-right text-[14px] font-bold text-muted-foreground w760:col-start-4">
        <b
          className="text-[22px] font-extrabold tracking-[-0.03em] tabular-nums w760:text-[26px]"
          style={{ color: `var(${row.swatch.token})` }}
        >
          {row.minutes}
        </b>{' '}
        {t('report.chapters.accessibility.min')}
      </span>
    </button>
  );
}
