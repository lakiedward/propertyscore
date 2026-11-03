import { DogIcon, FootprintsIcon, TreesIcon, TrophyIcon, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterChip } from '@/components/property/filter-chip';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  filterParks,
  PARK_FILTERS,
  parkFilterCounts,
  walkMinutes,
  type ParkFilter,
} from '../green-section.utils';
import type { GreenPark, ScoredGreenSection } from '../online-report.types';

const AMENITY_ICONS: Readonly<Record<string, LucideIcon>> = {
  playground: TrophyIcon,
  dog_park: DogIcon,
  sports: FootprintsIcon,
};

const KNOWN_AMENITIES = ['playground', 'dog_park', 'sports'] as const;

type GreenParksProps = {
  section: ScoredGreenSection;
  selectedParkId: string | null;
  onSelectPark: (parkId: string) => void;
};

export function GreenParks({ section, selectedParkId, onSelectPark }: GreenParksProps) {
  const { t } = useTranslation('onlineReports');
  const [filters, setFilters] = useState<ReadonlySet<ParkFilter>>(new Set());
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const counts = parkFilterCounts(section.parks);
  const parks = filterParks(section.parks, filters);
  const isApproximate = section.distance_method === 'straight_line';

  useEffect(() => {
    if (selectedParkId === null) return;
    itemRefs.current.get(selectedParkId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedParkId]);

  const toggleFilter = (filter: ParkFilter, isSelected: boolean) => {
    setFilters((current) => {
      const next = new Set(current);
      if (isSelected) next.add(filter);
      else next.delete(filter);
      return next;
    });
  };

  return (
    <section
      aria-labelledby="green-parks-title"
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h3 id="green-parks-title" className="text-h4">
          {t('green.parks.title')}
        </h3>
        <p className="text-small text-muted-foreground">
          {isApproximate ? t('green.parks.leadApproximate') : t('green.parks.lead')}
        </p>
      </div>
      {section.parks.length === 0 ? (
        <p className="rounded-lg bg-surface-sunken p-4 text-small">{t('green.parks.none')}</p>
      ) : (
        <>
          {PARK_FILTERS.some((filter) => counts[filter] > 0) ? (
            <div
              role="group"
              aria-label={t('green.parks.filtersLabel')}
              className="flex flex-wrap gap-2"
            >
              {PARK_FILTERS.filter((filter) => counts[filter] > 0).map((filter) => (
                <FilterChip
                  key={filter}
                  label={t(`green.parks.filter.${filter}`)}
                  count={counts[filter]}
                  isSelected={filters.has(filter)}
                  onSelectedChange={(isSelected) => {
                    toggleFilter(filter, isSelected);
                  }}
                />
              ))}
            </div>
          ) : null}
          {parks.length === 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-lg bg-surface-sunken p-4">
              <p className="text-small">{t('green.parks.noneFiltered')}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters(new Set());
                }}
              >
                {t('green.parks.clearFilters')}
              </Button>
            </div>
          ) : (
            <ol aria-labelledby="green-parks-title" className="flex flex-col gap-2">
              {parks.map((park) => (
                <li
                  key={park.id}
                  ref={(element) => {
                    if (element) itemRefs.current.set(park.id, element);
                    else itemRefs.current.delete(park.id);
                  }}
                >
                  <ParkRow
                    park={park}
                    number={section.parks.indexOf(park) + 1}
                    isSelected={park.id === selectedParkId}
                    isApproximate={isApproximate}
                    isNearestSmall={park.id === section.nearest_small_id}
                    isNearestLarge={park.id === section.nearest_large_id}
                    onSelect={() => {
                      onSelectPark(park.id);
                    }}
                  />
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

type ParkRowProps = {
  park: GreenPark;
  number: number;
  isSelected: boolean;
  isApproximate: boolean;
  isNearestSmall: boolean;
  isNearestLarge: boolean;
  onSelect: () => void;
};

function ParkRow({
  park,
  number,
  isSelected,
  isApproximate,
  isNearestSmall,
  isNearestLarge,
  onSelect,
}: ParkRowProps) {
  const { t } = useTranslation('onlineReports');
  const minutes = walkMinutes(park.walk_m);
  const distance = formatNumber(Math.round(park.walk_m / 10) * 10);
  const amenities = KNOWN_AMENITIES.filter((amenity) => park.amenities.includes(amenity));

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border p-3.5 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        isSelected
          ? 'border-category-green bg-category-green-surface'
          : 'border-border bg-card hover:bg-surface-sunken',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-full text-meta font-extrabold tabular-nums',
          isSelected
            ? 'bg-category-green text-on-inverse'
            : 'bg-category-green-surface text-category-green',
        )}
      >
        {number}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="font-bold">{park.name ?? t('green.parks.unnamed')}</span>
          <span className="text-small font-bold tabular-nums">
            {isApproximate
              ? t('green.parks.walkApproximate', { count: minutes })
              : t('green.parks.walk', { count: minutes })}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <TreesIcon aria-hidden className="size-3.5" />
            {t('green.parks.area', {
              area: formatNumber(park.area_ha, { maximumFractionDigits: 1 }),
            })}
          </span>
          <span>{t('green.parks.distance', { distance })}</span>
          {amenities.map((amenity) => {
            const Icon = AMENITY_ICONS[amenity] ?? TreesIcon;
            return (
              <span key={amenity} className="inline-flex items-center gap-1">
                <Icon aria-hidden className="size-3.5" />
                {t(`green.parks.amenity.${amenity}`)}
              </span>
            );
          })}
        </span>
        {isNearestSmall || isNearestLarge ? (
          <span className="flex flex-wrap gap-1.5 pt-0.5">
            {isNearestSmall ? (
              <span className="rounded-full bg-category-green-surface px-2 py-0.5 text-meta font-bold text-category-green">
                {t('green.parks.nearestSmall')}
              </span>
            ) : null}
            {isNearestLarge ? (
              <span className="rounded-full bg-category-green-surface px-2 py-0.5 text-meta font-bold text-category-green">
                {t('green.parks.nearestLarge')}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </button>
  );
}
