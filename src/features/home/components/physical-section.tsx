import {
  Building2Icon,
  CameraIcon,
  DoorOpenIcon,
  PlugZapIcon,
  SunIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import { CategoryChipList } from './category-chip-list';
import { CriteriaExplorer } from './criteria-explorer';
import { FindingExample } from './finding-example';
import { HowItWorksSteps } from './how-it-works-steps';
import { ProductPriceBox } from './product-price-box';
import { SectionHeading } from './section-heading';

const PHYSICAL_CHIPS = [
  { key: 'building', icon: Building2Icon },
  { key: 'apartment', icon: DoorOpenIcon },
  { key: 'systems', icon: PlugZapIcon },
  { key: 'comfort', icon: SunIcon },
  { key: 'risks', icon: TriangleAlertIcon },
  { key: 'media', icon: CameraIcon },
] as const;
const ROLES = ['buyer', 'seller'] as const;
type Role = (typeof ROLES)[number];

export function PhysicalSection() {
  const { t } = useTranslation('home');
  const [role, setRole] = useState<Role>('buyer');
  const price = formatPrice(SERVICE_PRICES.physical.amount, SERVICE_PRICES.physical.currency);
  const steps = t(`physical.journey.${role}`, { returnObjects: true });

  return (
    <section id={HOME_SECTION.physical} aria-labelledby="physical-title" className="bg-background">
      <div className="mx-auto grid max-w-wide gap-10 px-gutter py-section lg:grid-cols-[1.08fr_1fr] lg:gap-14">
        <div className="flex flex-col gap-6">
          <Logo product="physical" size="lg" />
          <SectionHeading
            id="physical-title"
            lead={t('physical.titleLead')}
            accent={t('physical.titleAccent')}
            tone="green"
          />
          <CategoryChipList
            label={t('physical.chipsLabel')}
            tone="physical"
            chips={PHYSICAL_CHIPS.map((chip) => ({
              key: chip.key,
              label: t(`physical.chips.${chip.key}`),
              icon: chip.icon,
            }))}
          />
        </div>
        <div className="flex flex-col gap-6 lg:pt-20">
          <p className="text-body text-muted-foreground lg:text-lead">
            <strong className="font-bold text-foreground">{t('physical.leadStrong')}</strong>{' '}
            {t('physical.lead')}
          </p>
          <ProductPriceBox
            product="physical"
            label={t('physical.price.label', { price })}
            name={t('physical.price.name')}
            kind={t('physical.price.kind')}
            price={price}
            footer={
              <span className="flex items-center gap-2">
                <BrandMark product="smartcheck" tone="inverse" size={20} />
                {t('physical.price.included')}
              </span>
            }
            ctaLabel={t('physical.price.cta')}
            ctaHash={HOME_SECTION.pricing}
          />
        </div>
      </div>
      <div className="mx-auto flex max-w-wide flex-col gap-10 px-gutter pb-section">
        <CriteriaExplorer />
        <div className="flex flex-col gap-6 rounded-2xl bg-card p-6 shadow-md ring-1 ring-border-subtle sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-h2">{t('physical.journey.title')}</h3>
            <ToggleGroup
              type="single"
              value={role}
              onValueChange={(value) => {
                const next = ROLES.find((option) => option === value);
                if (next) {
                  setRole(next);
                }
              }}
              aria-label={t('physical.journey.roleLabel')}
              className="gap-1 rounded-lg bg-secondary p-1"
            >
              {ROLES.map((option) => (
                <ToggleGroupItem
                  key={option}
                  value={option}
                  className="h-11 rounded-md px-4 text-label text-brand data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {t(`physical.journey.roles.${option}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <p className="text-small text-muted-foreground">
            <strong className="font-bold text-foreground">
              {t('physical.journey.serviceName', { price })}
            </strong>{' '}
            {t('physical.journey.serviceText')}
          </p>
          <HowItWorksSteps
            tone="light"
            steps={steps.map((step, index) => ({
              key: `${role}-${String(index)}`,
              title: step.title,
              text: step.text,
            }))}
          />
        </div>
        <FindingExample />
      </div>
    </section>
  );
}
