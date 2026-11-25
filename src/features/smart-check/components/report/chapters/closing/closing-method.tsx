import {
  ActivityIcon,
  BusIcon,
  HeartPulseIcon,
  InfoIcon,
  MapIcon,
  WindIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/i18n/format';
import { gtfsReferenceDate } from '../../../../accessibility.utils';
import type { ReadyReport } from '../../../../report.types';

const DATE_FORMAT = { day: 'numeric', month: 'short', year: 'numeric' } as const;
const MONTH_SHORT_FORMAT = { month: 'short', year: 'numeric' } as const;
const MONTH_FORMAT = { month: 'long', year: 'numeric' } as const;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH_RANGE = /^(\d{4})-(\d{2})\/(\d{4})-(\d{2})$/;

function withoutDots(text: string): string {
  return text.replaceAll('.', '');
}

function formatSourceDate(value: string): string {
  if (ISO_DAY.test(value)) return withoutDots(formatDate(value, DATE_FORMAT));
  const range = ISO_MONTH_RANGE.exec(value);
  if (!range) return value;
  const [, fromYear, fromMonth, toYear, toMonth] = range;
  const from = withoutDots(
    formatDate(`${String(fromYear)}-${String(fromMonth)}-01`, MONTH_SHORT_FORMAT),
  );
  const to = withoutDots(formatDate(`${String(toYear)}-${String(toMonth)}-01`, MONTH_SHORT_FORMAT));
  return `${from} – ${to}`;
}

type SourceKey =
  | 'osm'
  | 'walk_routing'
  | 'noise'
  | 'gtfs'
  | 'cams'
  | 'eea_stations'
  | 'eea_air_map'
  | 'eea_industrial'
  | 'siiir'
  | 'cnas'
  | 'ms_upu'
  | 'seismic'
  | 'earthquakes';

type Row = { source: SourceKey; date: string };

type GroupKey = 'map' | 'transit' | 'air' | 'services' | 'seismic';

type SourceGroup = { key: GroupKey; icon: LucideIcon; sources: readonly SourceKey[] };

const SOURCE_GROUPS: readonly SourceGroup[] = [
  { key: 'map', icon: MapIcon, sources: ['osm', 'walk_routing', 'noise'] },
  { key: 'transit', icon: BusIcon, sources: ['gtfs'] },
  {
    key: 'air',
    icon: WindIcon,
    sources: ['cams', 'eea_stations', 'eea_air_map', 'eea_industrial'],
  },
  { key: 'services', icon: HeartPulseIcon, sources: ['siiir', 'cnas', 'ms_upu'] },
  { key: 'seismic', icon: ActivityIcon, sources: ['seismic'] },
];

type ClosingMethodProps = {
  report: ReadyReport;
};

export function ClosingMethod({ report }: ClosingMethodProps) {
  const { t } = useTranslation('smartCheck');
  const dates = report.result.snapshot.source_dates;
  const formatted = (source: SourceKey) => {
    if (source === 'gtfs') {
      const date = gtfsReferenceDate(report.result.sections.accessibility);
      return date
        ? [{ source, date: withoutDots(formatDate(date, { ...DATE_FORMAT, timeZone: 'UTC' })) }]
        : [];
    }
    const value = dates[source];
    if (value === undefined) return [];
    return [{ source, date: formatSourceDate(value) }];
  };
  const seismic = report.result.sections.seismic;
  const codeYear = seismic ? /\d{4}$/.exec(seismic.code)?.[0] : undefined;
  const codeRows: Row[] =
    seismic && dates.seismic === undefined && codeYear !== undefined
      ? [{ source: 'seismic', date: codeYear }]
      : [];
  const earthquakes = seismic?.earthquakes ?? null;
  const earthquakeRows: Row[] = earthquakes
    ? [
        {
          source: 'earthquakes',
          date: earthquakes.retrieved_on
            ? `${String(earthquakes.since_year)} – ${withoutDots(formatDate(earthquakes.retrieved_on, MONTH_SHORT_FORMAT))}`
            : String(earthquakes.since_year),
        },
      ]
    : [];
  const groups = SOURCE_GROUPS.map((group) => ({
    key: group.key,
    icon: group.icon,
    rows: [
      ...group.sources.flatMap(formatted),
      ...(group.key === 'seismic' ? [...codeRows, ...earthquakeRows] : []),
    ],
  })).filter((group) => group.rows.length > 0);

  return (
    <section
      aria-labelledby="report-closing-method"
      className="rounded-[28px] border border-border bg-card p-4.5 shadow-report-card w560:p-7"
    >
      <p className="text-meta font-extrabold tracking-label text-muted-foreground uppercase">
        {t('report.chapters.closing.method.eyebrow')}
      </p>
      <h2
        id="report-closing-method"
        className="mt-1.5 text-[clamp(20px,2.4vw,26px)] leading-[1.15] font-extrabold tracking-[-0.025em] text-balance"
      >
        {t('report.chapters.closing.method.title')}
      </h2>
      <p className="mt-2.5 text-[15px] text-muted-foreground">
        {t('report.chapters.closing.method.lead')}
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 w760:grid-cols-3 w1059:grid-cols-5">
        {groups.map(({ key, icon: Icon, rows }) => (
          <div key={key} className="min-w-0 rounded-xl bg-muted p-3.5">
            <p className="mb-1 flex items-center gap-1.75 text-[12px] font-extrabold tracking-[0.06em] text-muted-foreground uppercase">
              <Icon aria-hidden className="size-3.75 text-(--ps-slate-600)" />
              {t(`report.chapters.closing.method.groups.${key}`)}
            </p>
            {rows.map((row) => (
              <div
                key={row.source}
                className="flex flex-col items-start gap-1 border-b border-(--ps-slate-100) py-1.75 text-[13.5px] last:border-b-0"
              >
                <span>{t(`report.chapters.closing.method.sources.${row.source}`)}</span>
                <span className="rounded-full bg-card px-2.25 py-0.5 text-[12.5px] font-bold whitespace-nowrap text-(--ps-slate-600)">
                  {row.date}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-3.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <InfoIcon aria-hidden className="size-3.75 flex-none" />
        {t('report.chapters.closing.method.snapshot', {
          month: formatDate(report.result.snapshot.period, MONTH_FORMAT),
          city: report.result.city.name,
        })}
      </p>
    </section>
  );
}
