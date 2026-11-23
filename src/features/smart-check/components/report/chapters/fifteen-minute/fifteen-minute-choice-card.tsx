import { InfoIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { formatList, formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  FAMILY_STYLES,
  choiceTiles,
  fewerThanTypical,
  type ChoiceTile,
  type FifteenMinuteSection,
} from '../../../../fifteen-minute.utils';

type FifteenMinuteChoiceCardProps = {
  section: FifteenMinuteSection;
};

function ChoiceTileCard({ tile }: { tile: ChoiceTile }) {
  const { t } = useTranslation('smartCheck');
  const { comparison } = tile;
  const Icon = tile.icon;
  const style = FAMILY_STYLES[tile.family];
  return (
    <li
      style={{ '--c': `var(${style.color})` } as CSSProperties}
      className="flex min-w-0 flex-col gap-1 rounded-xl border border-border-subtle bg-card px-3 pt-3.5 pb-3 w560:px-4 w560:pt-4 w560:pb-3.5"
    >
      <span
        aria-hidden="true"
        style={{ background: `var(${style.surface})`, color: `var(${style.color})` }}
        className="mb-1.5 grid size-9 place-items-center rounded-[9px]"
      >
        <Icon className="size-4.5" />
      </span>
      <b className="text-[32px] leading-none font-extrabold tracking-[-0.04em] tabular-nums w560:text-[40px]">
        {tile.count}
      </b>
      <span className="text-[14.5px] leading-[1.3] font-bold">
        {t(`report.chapters.fifteenMinute.groups.${tile.key}`, {
          defaultValue: t('report.chapters.fifteenMinute.groups.other'),
        })}
      </span>
      {comparison ? (
        <>
          <em
            className={cn(
              'mt-1.5 text-[13px] font-bold not-italic',
              comparison.kind === 'many' || comparison.kind === 'rare'
                ? 'text-(--c)'
                : 'text-muted-foreground',
            )}
          >
            {comparison.kind === 'many'
              ? t('report.chapters.fifteenMinute.tiles.many', {
                  ratio: formatNumber(comparison.ratio, {
                    maximumFractionDigits: Number.isInteger(comparison.ratio) ? 0 : 1,
                  }),
                })
              : t(`report.chapters.fifteenMinute.tiles.${comparison.kind}`)}
          </em>
          <small className="text-[12px] text-muted-foreground">
            {tile.typical === 0 || tile.typical === null
              ? t('report.chapters.fifteenMinute.tiles.typicalNone')
              : t('report.chapters.fifteenMinute.tiles.typical', { count: tile.typical })}
          </small>
        </>
      ) : null}
    </li>
  );
}

export function FifteenMinuteChoiceCard({ section }: FifteenMinuteChoiceCardProps) {
  const { t } = useTranslation('smartCheck');
  const tiles = choiceTiles(section);
  if (tiles.length === 0) return null;
  const fewer = fewerThanTypical(section).map((group) =>
    t('report.chapters.fifteenMinute.tiles.fewerItem', {
      label: t(`report.chapters.fifteenMinute.groups.${group.key}`, {
        defaultValue: t('report.chapters.fifteenMinute.groups.other'),
      }),
      count: group.count,
      typical: group.typical,
    }),
  );
  return (
    <section
      aria-labelledby="fifteen-choice-title"
      className="rounded-icon border border-border bg-card px-4 py-5 shadow-report-card w560:px-6.5 w560:py-6"
    >
      <p className="text-meta font-extrabold tracking-label text-report-fifteen-minute uppercase">
        {t('report.chapters.fifteenMinute.tiles.eyebrow')}
      </p>
      <h3
        id="fifteen-choice-title"
        className="mt-1 text-[19px] leading-tight font-bold tracking-[-0.02em] w560:text-[22px]"
      >
        {t('report.chapters.fifteenMinute.tiles.title')}
      </h3>
      <ul className="mt-5 grid grid-cols-2 gap-2.5 w560:gap-3 w1059:grid-cols-4">
        {tiles.map((tile) => (
          <ChoiceTileCard key={tile.key} tile={tile} />
        ))}
      </ul>
      {fewer.length > 0 ? (
        <p className="mt-3.5 flex gap-2 text-[13px] leading-[1.45] text-muted-foreground">
          <InfoIcon aria-hidden className="mt-0.5 size-3.75 shrink-0" />
          <span>
            {t('report.chapters.fifteenMinute.tiles.fewerNote', { list: formatList(fewer) })}
          </span>
        </p>
      ) : null}
    </section>
  );
}
