import { CircleCheckIcon, EyeIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ProductTag } from '@/components/brand/product-tag';
import { formatDate, formatNumber } from '@/i18n/format';

type DeclaredDetails = {
  declared_rooms: number | null;
  declared_area_m2: number | null;
  declared_floor: number | null;
  declared_building_floors: number | null;
  declared_construction_year: number | null;
};

type ReportHeaderProps = {
  addressText: string;
  code: string;
  generatedAt: string;
  period: string;
  formulaLabel: string;
  declared: DeclaredDetails;
  scoreCard: ReactNode;
  isShared: boolean;
  actions?: ReactNode;
};

function useDeclaredParts(declared: DeclaredDetails): string[] {
  const { t } = useTranslation('onlineReports');
  const parts: string[] = [];
  if (declared.declared_rooms !== null) {
    parts.push(t('header.rooms', { count: declared.declared_rooms }));
  }
  if (declared.declared_area_m2 !== null) {
    parts.push(t('header.area', { area: formatNumber(declared.declared_area_m2) }));
  }
  if (declared.declared_floor !== null) {
    parts.push(
      declared.declared_building_floors === null
        ? t('header.floor', { floor: declared.declared_floor })
        : t('header.floorOf', {
            floor: declared.declared_floor,
            floors: declared.declared_building_floors,
          }),
    );
  }
  if (declared.declared_construction_year !== null) {
    parts.push(t('header.builtIn', { year: declared.declared_construction_year }));
  }
  return parts;
}

export function ReportHeader({
  addressText,
  code,
  generatedAt,
  period,
  formulaLabel,
  declared,
  scoreCard,
  isShared,
  actions,
}: ReportHeaderProps) {
  const { t } = useTranslation('onlineReports');
  const declaredParts = useDeclaredParts(declared);

  return (
    <section className="bg-info text-info-foreground">
      <div className="mx-auto grid max-w-wide items-center gap-x-10 gap-y-7 px-gutter py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,1fr)] lg:py-14">
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-7.5 items-center gap-1.5 rounded-full bg-cta px-3 text-caption font-extrabold text-cta-foreground">
              {isShared ? (
                <EyeIcon aria-hidden className="size-3.5" />
              ) : (
                <CircleCheckIcon aria-hidden className="size-3.5" />
              )}
              {isShared ? t('header.shared') : t('header.saved')}
            </span>
            <ProductTag product="smartcheck" />
            <span className="inline-flex min-h-7.5 items-center rounded-full bg-on-inverse/12 px-3 text-caption font-bold">
              {t('header.code', { code, date: formatDate(generatedAt) })}
            </span>
          </div>
          <h1 className="text-h1 text-balance">{addressText}</h1>
          {declaredParts.length > 0 ? (
            <p className="text-body-sm text-on-info-soft">
              {[...declaredParts, t('header.declaredSuffix')].join(' · ')}
            </p>
          ) : null}
          <p className="text-caption text-on-info-soft">
            {t('header.calculatedOn', {
              period: formatDate(period, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
              formula: formulaLabel,
            })}
          </p>
          {actions ? <div className="flex flex-wrap gap-2 pt-1 print:hidden">{actions}</div> : null}
        </div>
        {scoreCard}
      </div>
    </section>
  );
}
