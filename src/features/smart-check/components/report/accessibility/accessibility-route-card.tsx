import { BusFrontIcon, CarFrontIcon, InfoIcon, MapPinIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DESTINATION_GROUPS,
  type DestinationGroup,
  type DestinationMode,
  destinationRows,
  matchingRows,
} from '../../../accessibility.utils';
import type { ReadyReport } from '../../../report.types';
import type { AccessibilitySection } from '../../../sections/accessibility.types';
import { AccessibilityRouteMap } from './accessibility-route-map';
import { DestinationRow } from './destination-row';

const LEG_KEY = [
  { kind: 'walk', dot: 'bg-muted-foreground' },
  { kind: 'wait', dot: 'bg-warning-fill' },
  { kind: 'ride', dot: 'bg-report-industry' },
] as const;

const TRAVEL_MODES = [
  { value: 'transit', Icon: BusFrontIcon, label: 'report.chapters.accessibility.transitMode' },
  { value: 'car', Icon: CarFrontIcon, label: 'report.chapters.accessibility.car.mode' },
] as const;

type AccessibilityRouteCardProps = {
  report: ReadyReport;
  section: AccessibilitySection;
  sourceNote: string;
};

export function AccessibilityRouteCard({
  report,
  section,
  sourceNote,
}: AccessibilityRouteCardProps) {
  const { t, i18n } = useTranslation('smartCheck');
  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'ro';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [group, setGroup] = useState<DestinationGroup>('places');
  const [mode, setMode] = useState<DestinationMode>('transit');
  const [query, setQuery] = useState('');
  const groupsByMode = {
    places: destinationRows(section, 'places', mode),
    highSchools: destinationRows(section, 'highSchools', mode),
    faculties: destinationRows(section, 'faculties', mode),
  };
  const places = groupsByMode.places;
  const isPlaces = group === 'places';
  const isCar = mode === 'car';
  const groupRows = groupsByMode[group];
  const rows = isPlaces ? groupRows : matchingRows(groupRows, query, language);
  const selectedPick = isPlaces ? undefined : groupRows.find((row) => row.id === selectedId);
  const mapRows = selectedPick ? [...places, selectedPick] : places;
  const groups = DESTINATION_GROUPS.filter(
    (option) => option === 'places' || groupsByMode[option].length > 0,
  );

  const handleGroup = (next: DestinationGroup) => {
    setGroup(next);
    setQuery('');
    setSelectedId(null);
  };

  const handleSelect = (id: string) => {
    setSelectedId((current) => (current === id ? null : id));
  };

  return (
    <section
      aria-labelledby="accessibility-routes-title"
      className="flex flex-col gap-3 min-[560px]:rounded-2xl min-[560px]:border min-[560px]:border-border min-[560px]:bg-card min-[560px]:p-5 min-[560px]:shadow-report-panel"
    >
      <ToggleGroup
        type="single"
        value={mode}
        aria-label={t('report.chapters.accessibility.travelMode')}
        className="flex flex-wrap"
        onValueChange={(value) => {
          if (value !== 'transit' && value !== 'car') return;
          setMode(value);
          handleGroup('places');
        }}
      >
        {TRAVEL_MODES.map(({ value, Icon, label }) => (
          <ToggleGroupItem key={value} value={value} className="min-h-11">
            <Icon aria-hidden="true" />
            {t(label)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="relative h-130 overflow-hidden rounded-xl border border-border bg-report-map-land w760:h-140">
        <AccessibilityRouteMap
          report={report}
          rows={mapRows}
          namedId={selectedPick?.id ?? null}
          stops={isCar ? [] : section.stops}
          mode={mode}
          selectedId={selectedId}
        />
        <span className="pointer-events-none absolute top-2.5 left-2.5 z-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/96 px-2.75 py-1.25 text-[12.5px] font-bold text-foreground shadow-report-label">
          <i aria-hidden="true" className="size-2.25 rounded-full bg-report-noise" />
          {t(
            isCar
              ? 'report.chapters.accessibility.car.mapChip'
              : 'report.chapters.accessibility.mapChip',
          )}
        </span>
        <div className="pointer-events-none absolute bottom-9 left-2.5 z-3 grid gap-0.75 rounded-thumb border border-border bg-card/96 px-3 py-2 text-[12px] text-muted-foreground shadow-report-label min-[560px]:bottom-2.5">
          <b className="text-foreground">{t('report.chapters.accessibility.legendTitle')}</b>
          <span className="flex items-center gap-2">
            <i aria-hidden="true" className="size-2.5 rounded-full bg-primary" />
            {t('report.chapters.accessibility.legendAddress')}
          </span>
          <span className="flex items-center gap-2">
            <i aria-hidden="true" className="h-2 w-4 rounded-[3px] bg-report-noise" />
            {t(
              isCar
                ? 'report.chapters.accessibility.car.legend'
                : 'report.chapters.accessibility.legendVehicle',
            )}
          </span>
          {isCar ? null : (
            <span className="flex items-center gap-2">
              <i
                aria-hidden="true"
                className="h-0.75 w-4 bg-[radial-gradient(circle,var(--report-noise)_1.5px,transparent_1.6px)] bg-size-[5px_3px]"
              />
              {t('report.chapters.accessibility.legendWalk')}
            </span>
          )}
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 px-1 text-small font-semibold">
        {mapRows.map((row) => (
          <li
            key={row.id}
            className={cn(
              'inline-flex items-baseline gap-2',
              row.id === selectedPick?.id && '-mx-1.5 rounded-md bg-report-summary-soft px-1.5',
            )}
          >
            <i
              aria-hidden="true"
              className={cn('size-2.5 shrink-0 self-center rounded-full', row.swatch.fill)}
            />
            <span>{row.label[language]}</span>
            <b className={cn('shrink-0 whitespace-nowrap', row.swatch.text)}>
              {t('report.chapters.accessibility.minutes', { minutes: row.minutes })}
            </b>
          </li>
        ))}
      </ul>

      <div className="px-1 pt-3 max-[559px]:rounded-xl max-[559px]:border max-[559px]:border-border max-[559px]:bg-card max-[559px]:p-4 max-[559px]:shadow-report-panel min-[560px]:pt-1">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
          <h3
            id="accessibility-routes-title"
            className="text-[18px] font-extrabold tracking-[-0.01em]"
          >
            {t(
              isCar
                ? 'report.chapters.accessibility.car.routesTitle'
                : 'report.chapters.accessibility.routesTitle',
            )}
          </h3>
          {isCar ? null : (
            <ul className="hidden flex-wrap gap-3.5 text-[12px] text-muted-foreground w760:flex">
              {LEG_KEY.map((item) => (
                <li key={item.kind} className="inline-flex items-center gap-1.25">
                  <i aria-hidden="true" className={cn('size-2.5 rounded-[3px]', item.dot)} />
                  {t(`report.chapters.accessibility.legKey.${item.kind}`)}
                </li>
              ))}
            </ul>
          )}
        </div>
        {groups.length > 1 ? (
          <div
            role="radiogroup"
            aria-label={t('report.chapters.accessibility.groupLabel')}
            className="mt-3 inline-flex gap-0.5 rounded-lg bg-report-summary-soft p-0.75 max-[700px]:w-full"
          >
            {groups.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={option === group}
                onClick={() => {
                  handleGroup(option);
                }}
                className={cn(
                  'rounded-md px-3.5 py-1.5 text-[14px] font-bold whitespace-nowrap text-muted-foreground transition-colors focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none max-[700px]:flex-1 max-[700px]:px-2 max-[700px]:text-[13px]',
                  option === group && 'bg-card text-primary shadow-segment',
                )}
              >
                {t(`report.chapters.accessibility.groups.${option}`)}
                {option === 'places' ? null : (
                  <span className="ml-1 text-[12px] font-extrabold text-muted-foreground">
                    {groupsByMode[option].length}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : null}
        {isPlaces ? null : (
          <div className="mt-3 flex h-11 max-w-105 items-center gap-2 rounded-thumb border border-border bg-card px-3 focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/30">
            <MapPinIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder={t(`report.chapters.accessibility.search.${group}`)}
              aria-label={t('report.chapters.accessibility.search.label')}
              className="h-full border-0 bg-transparent px-0 text-[15px] focus-visible:ring-0 md:text-[15px]"
            />
          </div>
        )}
        <div
          className={cn(
            'mt-3 grid',
            !isPlaces &&
              '-mr-1.5 max-h-110 [scrollbar-width:thin] overflow-auto pr-1.5 max-[700px]:max-h-130',
          )}
        >
          {rows.map((row) => (
            <DestinationRow
              key={row.id}
              row={row}
              isPick={!isPlaces}
              isSelected={selectedId === row.id}
              onSelect={handleSelect}
            />
          ))}
          {rows.length === 0 ? (
            <p className="px-1 py-4 text-[14px] text-muted-foreground">
              {isCar && isPlaces
                ? t('report.chapters.accessibility.car.unavailable')
                : t('report.chapters.accessibility.search.empty', { query })}
            </p>
          ) : null}
        </div>
        {isPlaces ? null : (
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            {t('report.chapters.accessibility.search.hint')}
          </p>
        )}
        <p className="mt-2.5 flex gap-2 text-[12.5px] leading-[1.45] text-muted-foreground">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-3.75 shrink-0" />
          <span>{isCar ? t('report.chapters.accessibility.car.source') : sourceNote}</span>
        </p>
      </div>
    </section>
  );
}
