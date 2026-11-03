import { useTranslation } from 'react-i18next';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatNumber, formatPercent } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { useRadiusLabel } from '../hooks/use-radius-label';
import { discAreaPerPercent, shareFor, waffleCells } from '../green-section.utils';
import type { ScoredGreenSection } from '../online-report.types';

const WAFFLE_CELLS = Array.from({ length: 100 }, (_, index) => index);

const SAME_AS_CITY_MARGIN = 0.01;

type GreenShareProps = {
  section: ScoredGreenSection;
  radiusM: number;
  onRadiusChange: (radiusM: number) => void;
};

function comparison(share: number, cityShare: number | null) {
  if (cityShare === null) return undefined;
  if (Math.abs(share - cityShare) <= SAME_AS_CITY_MARGIN) return 'same' as const;
  return share > cityShare ? ('above' as const) : ('below' as const);
}

export function GreenShare({ section, radiusM, onRadiusChange }: GreenShareProps) {
  const { t } = useTranslation('onlineReports');
  const radiusLabel = useRadiusLabel();
  const share = shareFor(section.share, radiusM);
  const nearShare = shareFor(section.share, section.near_radius_m);
  const filled = waffleCells(share);
  const versusCity = comparison(nearShare, section.city_avg_share_near);

  const bars = [
    ...section.radii_m.map((radius) => ({
      id: String(radius),
      label: radiusLabel(radius),
      value: shareFor(section.share, radius),
      isSelected: radius === radiusM,
      isCity: false,
    })),
    ...(section.city_avg_share_near === null
      ? []
      : [
          {
            id: 'city',
            label: t('green.share.cityAverage', { radius: radiusLabel(section.near_radius_m) }),
            value: section.city_avg_share_near,
            isSelected: false,
            isCity: true,
          },
        ]),
  ];

  return (
    <section
      aria-labelledby="green-share-title"
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="green-share-title" className="text-h4 text-balance">
            {versusCity
              ? t(`green.share.title.${versusCity}`, {
                  share: formatPercent(nearShare, 1),
                  radius: radiusLabel(section.near_radius_m),
                })
              : t('green.share.titleNoCity', {
                  share: formatPercent(nearShare, 1),
                  radius: radiusLabel(section.near_radius_m),
                })}
          </h3>
          <p className="text-small text-muted-foreground">{t('green.share.lead')}</p>
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          value={String(radiusM)}
          onValueChange={(value) => {
            const next = section.radii_m.find((radius) => String(radius) === value);
            if (next !== undefined) onRadiusChange(next);
          }}
          aria-label={t('green.radius.label')}
          className="gap-1 rounded-full border border-border bg-surface-sunken p-1"
        >
          {section.radii_m.map((radius) => (
            <ToggleGroupItem
              key={radius}
              value={String(radius)}
              className="h-8 rounded-full px-3 text-caption font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {radiusLabel(radius)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
        <figure className="flex flex-col items-center gap-2.5 sm:items-start">
          <div
            role="img"
            aria-label={t('green.share.waffleLabel', {
              count: filled,
              radius: radiusLabel(radiusM),
            })}
            className="grid w-44 grid-cols-10 gap-0.75"
          >
            {WAFFLE_CELLS.map((cell) => (
              <span
                key={`${String(radiusM)}-${String(cell)}`}
                style={{ animationDelay: `${String(cell * 6)}ms` }}
                className={cn(
                  'aspect-square rounded-[3px] fill-mode-backwards motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:fade-in',
                  cell < filled ? 'bg-category-green' : 'bg-category-green-surface',
                )}
              />
            ))}
          </div>
          <figcaption className="max-w-44 text-meta text-muted-foreground">
            {t('green.share.waffleCaption', {
              area: formatNumber(discAreaPerPercent(radiusM)),
            })}
          </figcaption>
        </figure>
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-3">
            {bars.map((bar) => (
              <li key={bar.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-small">
                  <span className={cn(bar.isSelected ? 'font-bold' : 'text-muted-foreground')}>
                    {bar.label}
                  </span>
                  <span className="font-bold tabular-nums">{formatPercent(bar.value, 1)}</span>
                </div>
                <div aria-hidden className="h-2.5 overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
                      bar.isCity
                        ? 'bg-muted-foreground/50'
                        : bar.isSelected
                          ? 'bg-category-green'
                          : 'bg-category-green-fill',
                    )}
                    style={{
                      width: `${String(Math.min(100, (bar.value / section.share_cap) * 100))}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-meta text-muted-foreground">
            {t('green.share.scale', { cap: formatPercent(section.share_cap) })}
          </p>
        </div>
      </div>
    </section>
  );
}
