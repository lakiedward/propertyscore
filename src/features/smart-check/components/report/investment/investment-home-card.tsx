import { useTranslation } from 'react-i18next';
import { Slider } from '@/components/ui/slider';
import { formatNumber, formatPrice } from '@/i18n/format';
import { AREA_MAX, AREA_MIN } from '../../../investment.utils';
import { ExamplePill } from './example-pill';
import { InvestmentCard } from './investment-card';

type InvestmentHomeCardProps = {
  area: number;
  isDeclared: boolean;
  onAreaChange: (area: number) => void;
  price: number;
  low: number | null;
  high: number | null;
  rent: number | null;
  isRentExample: boolean;
};

export function InvestmentHomeCard({
  area,
  isDeclared,
  onAreaChange,
  price,
  low,
  high,
  rent,
  isRentExample,
}: InvestmentHomeCardProps) {
  const { t } = useTranslation('smartCheck');
  const areaText = t('report.chapters.investment.home.area', { area: formatNumber(area) });
  return (
    <InvestmentCard eyebrow={t('report.chapters.investment.home.eyebrow')}>
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-bold text-muted-foreground">
          {t(
            isDeclared
              ? 'report.chapters.investment.home.declaredArea'
              : 'report.chapters.investment.home.chosenArea',
          )}
        </span>
        <b className="text-[18px] font-extrabold tabular-nums">{areaText}</b>
      </div>
      <Slider
        className="mt-3"
        min={AREA_MIN}
        max={AREA_MAX}
        step={1}
        value={[area]}
        onValueChange={([next]) => {
          if (next !== undefined) onAreaChange(next);
        }}
        thumbLabel={t('report.chapters.investment.home.sliderLabel')}
        thumbValueText={areaText}
      />
      <p className="mt-1.5 flex justify-between text-[11.5px] font-semibold text-muted-foreground tabular-nums">
        <span>{t('report.chapters.investment.home.area', { area: AREA_MIN })}</span>
        <span>{t('report.chapters.investment.home.area', { area: AREA_MAX })}</span>
      </p>
      <div aria-live="polite" className="mt-4 rounded-icon bg-primary px-5 py-4 text-on-inverse">
        <p className="text-[13.5px] font-bold">{t('report.chapters.investment.home.price')}</p>
        <p className="mt-1 text-[clamp(30px,3.4vw,40px)] leading-none font-extrabold tracking-[-0.03em] tabular-nums">
          {t('report.chapters.investment.home.approx', { value: formatPrice(price, 'EUR') })}
        </p>
        {low !== null && high !== null ? (
          <p className="mt-2 text-[12.5px] text-on-inverse-muted tabular-nums">
            {t('report.chapters.investment.home.between', {
              low: formatNumber(low),
              high: formatPrice(high, 'EUR'),
            })}
          </p>
        ) : null}
      </div>
      {rent === null ? null : (
        <div className="mt-3 rounded-icon bg-surface-highlight px-5 py-4">
          <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-bold text-muted-foreground">
            {t('report.chapters.investment.home.rent')}
            {isRentExample ? <ExamplePill /> : null}
          </p>
          <p className="mt-1 text-[22px] font-extrabold tracking-[-0.02em] tabular-nums">
            {t('report.chapters.investment.home.approx', { value: formatPrice(rent, 'EUR') })}{' '}
            <span className="text-[14px] font-bold text-muted-foreground">
              {t('report.chapters.investment.home.perMonth')}
            </span>
          </p>
        </div>
      )}
    </InvestmentCard>
  );
}
