import { useTranslation } from 'react-i18next';
import { SplitPrice } from '@/components/property/split-price';
import { ScoreValue } from '@/components/trust/score-value';
import { cn } from '@/lib/utils';
import { SAMPLE_REPORT } from '../data/sample-report';
import {
  CATEGORY_ICON,
  CATEGORY_STYLE,
  HOME_CATEGORIES,
  PRICES_HUE,
  PRICES_ICON,
} from '../home.categories';
import { useBrandNames } from '../hooks/use-brand-names';

const tileClassName = 'flex flex-col gap-2 rounded-xl bg-card p-5 text-info-ink shadow-tile';
const iconClassName = 'grid size-11 place-items-center rounded-icon';
const nameClassName = 'text-h4 leading-[1.15] font-extrabold tracking-[-0.02em]';

export function ZoneReportTiles() {
  const { t } = useTranslation('home');
  const brands = useBrandNames();

  return (
    <div className="bg-card pt-14 pb-16 text-info-ink w960:pb-20">
      <div className="page-wrap">
        <div className="mb-9 grid grid-cols-1 gap-x-12 gap-y-4 w760:grid-cols-2">
          <h3 className="text-h2 text-info-ink">{t('smartCheck.report.title')}</h3>
          <p className="max-w-copy text-lead-sm text-info-ink-muted">
            {t('smartCheck.report.text')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3.5 w480:grid-cols-2 w1080:grid-cols-4">
          <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-info p-7.5 text-on-inverse shadow-info w480:col-span-2 w1080:row-span-2 w1080:flex-col w1080:flex-nowrap w1080:items-start">
            <p className="text-caption font-extrabold tracking-eyebrow text-on-info-muted uppercase">
              {t('smartCheck.report.overallLabel', brands)}
            </p>
            <ScoreValue
              variant="stroke"
              size="lg"
              hue="onInverse"
              value={SAMPLE_REPORT.overallScore}
              caption={t('smartCheck.report.outOf')}
              label={t('smartCheck.report.scoreLabel', { score: SAMPLE_REPORT.overallScore })}
              className="w-37.5 w1080:my-auto w1080:w-55 w1080:self-center"
            />
            <p className="max-w-90 flex-[1_1_220px] text-body text-info-surface w1080:flex-none">
              {t('smartCheck.report.overallText')}
            </p>
          </div>
          {HOME_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICON[category];
            const score = SAMPLE_REPORT.scores[category];
            return (
              <div key={category} className={tileClassName}>
                <div className="mb-2 flex items-center justify-between">
                  <span className={cn(iconClassName, CATEGORY_STYLE[category].tile)}>
                    <Icon aria-hidden className="size-5.5" />
                  </span>
                  <ScoreValue
                    variant="stroke"
                    size="sm"
                    hue={category}
                    value={score}
                    label={t('smartCheck.report.scoreLabel', { score })}
                    className="w-13"
                  />
                </div>
                <h4 className={nameClassName}>{t(`categories.${category}.name`)}</h4>
                <p className="max-w-copy text-small text-info-ink-muted">
                  {t(`smartCheck.report.tiles.${category}`)}
                </p>
              </div>
            );
          })}
          <div className={tileClassName}>
            <div className="mb-2 flex items-center justify-between">
              <span className={cn(iconClassName, CATEGORY_STYLE[PRICES_HUE].tile)}>
                <PRICES_ICON aria-hidden className="size-5.5" />
              </span>
            </div>
            <p className="-mt-1 mb-1 text-price-box tracking-[-0.045em] tabular-nums">
              <SplitPrice
                amount={SAMPLE_REPORT.pricePerM2}
                currency={SAMPLE_REPORT.currency}
                currencyClassName="text-small font-bold tracking-normal text-info"
              />
              <small className="text-small font-bold tracking-normal text-info">
                {t('smartCheck.report.perM2')}
              </small>
            </p>
            <h4 className={nameClassName}>{t('categories.prices.name')}</h4>
            <p className="max-w-copy text-small text-info-ink-muted">
              {t('smartCheck.report.tiles.prices')}
            </p>
          </div>
        </div>
        <p className="mt-4 max-w-copy text-caption text-info-ink-muted">{t('examples.values')}</p>
      </div>
    </div>
  );
}
