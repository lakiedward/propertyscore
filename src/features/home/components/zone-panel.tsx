import { Trans, useTranslation } from 'react-i18next';
import { ExampleLabel } from '@/components/feedback/example-label';
import { Price } from '@/components/property/price';
import { StatCard } from '@/components/report/stat-card';
import { ScoreValue } from '@/components/trust/score-value';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import { SAMPLE_REPORT } from '../data/sample-report';
import { ZONE_CHAPTERS } from '../home.categories';
import { useBrandNames } from '../hooks/use-brand-names';
import { PanelIntro } from './panel-intro';
import { ZoneRoutesIllustration } from './zone-routes-illustration';

const METHOD_ITEM = 'method';
const ROUTES_ITEM = 'routes';
const SAFETY_SCORE = SAMPLE_REPORT.scores.safety;

export function ZonePanel() {
  const { t } = useTranslation('home');
  const brands = useBrandNames();
  const smartCheckPrice = formatPrice(
    SERVICE_PRICES.smartCheck.amount,
    SERVICE_PRICES.smartCheck.currency,
  );
  const method = t('deliverables.zone.method', { returnObjects: true });

  return (
    <>
      <PanelIntro
        eyebrow={t('deliverables.zone.eyebrow', brands)}
        lead={t('deliverables.zone.titleLead')}
        accent={t('deliverables.zone.titleAccent')}
        text={
          <Trans
            t={t}
            i18nKey="deliverables.zone.text"
            values={{ price: smartCheckPrice }}
            components={{ strong: <strong className="font-bold text-foreground" /> }}
          />
        }
      />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div
          role="group"
          aria-label={t('deliverables.zone.indicatorsLabel')}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap gap-2">
            <ExampleLabel label={t('examples.values')} />
          </div>
          <p className="text-caption text-muted-foreground">{t('deliverables.zone.comparison')}</p>
          <div className="flex items-center gap-4 rounded-xl bg-info-surface p-4">
            <ScoreValue
              value={SAFETY_SCORE}
              size="md"
              hue="safety"
              label={t('deliverables.zone.gaugeLabel', { score: SAFETY_SCORE })}
            />
            <span className="flex flex-col gap-1">
              <span className="text-meta font-bold text-muted-foreground uppercase">
                {t('deliverables.zone.scoreEyebrow')}
              </span>
              <span className="text-h4">{t('categories.safety.name')}</span>
              <span className="text-caption text-muted-foreground">
                {t('deliverables.zone.scoreText')}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard
              label={t('deliverables.zone.rentLabel')}
              value={
                <Price
                  amount={SAMPLE_REPORT.monthlyRent}
                  currency={SAMPLE_REPORT.currency}
                  period="month"
                />
              }
              hint={t('deliverables.zone.rentText')}
            />
            <StatCard
              label={t('deliverables.zone.priceLabel')}
              value={formatPrice(SAMPLE_REPORT.price, SAMPLE_REPORT.currency)}
              hint={
                <Trans
                  t={t}
                  i18nKey="deliverables.zone.priceText"
                  values={{ perM2: formatPrice(SAMPLE_REPORT.pricePerM2, SAMPLE_REPORT.currency) }}
                  components={{ strong: <strong className="font-bold text-foreground" /> }}
                />
              }
            />
          </div>
          <p className="text-caption text-muted-foreground">{t('deliverables.zone.marketNote')}</p>
          <div className="flex flex-col gap-2">
            <p className="text-label">{t('deliverables.zone.chaptersTitle')}</p>
            <ul className="flex flex-wrap gap-1.5">
              {ZONE_CHAPTERS.map((chapter) => (
                <li
                  key={chapter}
                  className="rounded-full bg-surface-alt px-3 py-1 text-caption font-semibold text-brand"
                >
                  {t(`categories.${chapter}.name`)}
                </li>
              ))}
            </ul>
          </div>
          <Accordion type="multiple" className="border-t border-border-subtle">
            <AccordionItem value={METHOD_ITEM} className="border-border-subtle">
              <AccordionTrigger>{t('deliverables.zone.methodTitle')}</AccordionTrigger>
              <AccordionContent>
                <dl className="flex flex-col gap-3">
                  {method.map((item) => (
                    <div key={item.title}>
                      <dt className="font-bold text-foreground">{item.title}</dt>
                      <dd>{item.text}</dd>
                    </div>
                  ))}
                </dl>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value={ROUTES_ITEM} className="border-border-subtle">
              <AccordionTrigger>{t('deliverables.zone.routesTitle')}</AccordionTrigger>
              <AccordionContent>{t('deliverables.zone.routesText')}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <div className="flex flex-col gap-4">
          <ZoneRoutesIllustration />
          <div className="rounded-lg bg-surface-alt p-4">
            <p className="text-label">{t('deliverables.zone.sourcesTitle')}</p>
            <p className="text-small text-muted-foreground">{t('deliverables.zone.sourcesText')}</p>
          </div>
        </div>
      </div>
    </>
  );
}
