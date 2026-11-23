import { DatabaseIcon, InfoIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReportChapterHead } from '@/components/report/report-chapter-head';
import { formatNumber, formatPrice } from '@/i18n/format';
import {
  estimateForArea,
  historyChange,
  initialArea,
  isCityWide,
  rentForArea,
} from '../../../investment.utils';
import { InvestmentHistoryCard } from '../investment/investment-history-card';
import { InvestmentHomeCard } from '../investment/investment-home-card';
import { InvestmentPriceCard } from '../investment/investment-price-card';
import { InvestmentSourcesCard } from '../investment/investment-sources-card';
import { InvestmentYieldCard } from '../investment/investment-yield-card';
import type { ReportChapterProps } from '../report-chapter-props';

const TITLE_ID = 'report-chapter-investment';

function EmptyChapter() {
  const { t } = useTranslation('smartCheck');
  return (
    <section aria-labelledby={TITLE_ID} className="grid min-w-0 gap-4">
      <ReportChapterHead
        hue="context"
        titleId={TITLE_ID}
        eyebrow={t('report.chapters.investment.eyebrow')}
        badge={t('report.chapters.investment.badgeNoData')}
        title={t('report.chapters.investment.empty.headline')}
        lead={t('report.chapters.investment.empty.lead')}
      />
      <div className="rounded-icon border border-border bg-card p-5 shadow-report-card w760:p-6.5">
        <DatabaseIcon aria-hidden="true" className="size-6 text-muted-foreground" />
        <h3 className="mt-3 text-[19px] font-extrabold tracking-[-0.02em]">
          {t('report.chapters.investment.empty.title')}
        </h3>
        <p className="mt-1.5 max-w-[62ch] text-[14.5px] leading-normal text-muted-foreground">
          {t('report.chapters.investment.empty.text')}
        </p>
      </div>
      <p className="flex gap-2 text-[12.5px] leading-[1.45] text-muted-foreground">
        <InfoIcon aria-hidden="true" className="mt-0.5 size-3.75 shrink-0" />
        <span>{t('report.chapters.investment.note')}</span>
      </p>
    </section>
  );
}

export function InvestmentChapter({ report }: ReportChapterProps) {
  const { t } = useTranslation('smartCheck');
  const { result } = report;
  const investment = result.sections.investment;
  const sale = investment?.sale && isCityWide(investment.sale.precision) ? investment.sale : null;
  const [chosenArea, setChosenArea] = useState<number | null>(null);

  if (!investment || !sale) return <EmptyChapter />;

  const cityName = result.city.name;
  const area = chosenArea ?? initialArea(investment, sale);
  const estimate = estimateForArea(investment, sale, area);
  const rent = rentForArea(investment, area);
  const grossPct = investment.yield.gross_pct;
  const change = historyChange(investment.history?.months ?? []);
  const isRentExample = investment.rent?.is_example === true;
  const hasExample = isRentExample || investment.yield.is_example === true;
  const declaredArea = investment.declared.area_m2;
  const declaredEstimate =
    declaredArea === null ? null : estimateForArea(investment, sale, declaredArea).price;

  return (
    <section aria-labelledby={TITLE_ID} className="grid min-w-0 gap-4">
      <ReportChapterHead
        hue="context"
        titleId={TITLE_ID}
        eyebrow={t('report.chapters.investment.eyebrow')}
        badge={t('report.chapters.investment.badgeCity')}
        title={t('report.chapters.investment.headline.city', {
          city: cityName,
          value: formatNumber(Math.round(sale.median_eur_m2)),
        })}
        lead={
          declaredArea !== null && declaredEstimate !== null
            ? t('report.chapters.investment.lead.declared', {
                area: formatNumber(declaredArea),
                price: formatPrice(declaredEstimate, 'EUR'),
              })
            : t('report.chapters.investment.lead.asking')
        }
      />
      <div className="grid min-w-0 gap-4 w960:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <InvestmentPriceCard investment={investment} sale={sale} cityName={cityName} />
        <div className="grid min-w-0 content-start gap-4">
          <InvestmentHomeCard
            area={area}
            isDeclared={declaredArea !== null && declaredArea === area}
            onAreaChange={setChosenArea}
            price={estimate.price}
            low={estimate.low}
            high={estimate.high}
            rent={rent}
            isRentExample={isRentExample}
          />
          {grossPct === null ? null : (
            <InvestmentYieldCard
              cityName={cityName}
              grossPct={grossPct}
              isExample={investment.yield.is_example === true}
            />
          )}
        </div>
      </div>
      {change ? <InvestmentHistoryCard change={change} area={area} /> : null}
      <InvestmentSourcesCard investment={investment} cityName={cityName} hasExample={hasExample} />
    </section>
  );
}
