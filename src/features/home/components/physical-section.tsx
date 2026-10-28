import {
  Building2Icon,
  CameraIcon,
  FileTextIcon,
  HouseIcon,
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
import { cn } from '@/lib/utils';
import { CriteriaExplorer } from './criteria-explorer';
import { FindingExample } from './finding-example';
import { ProductPriceBox } from './product-price-box';

const PHYSICAL_CHIPS = [
  { key: 'building', icon: Building2Icon },
  { key: 'apartment', icon: DoorOpenIcon },
  { key: 'systems', icon: PlugZapIcon },
  { key: 'comfort', icon: SunIcon },
  { key: 'risks', icon: TriangleAlertIcon },
  { key: 'media', icon: CameraIcon },
] as const;
const JOURNEY_MARKERS = [
  { icon: HouseIcon, className: 'bg-category-transport-fill text-category-transport-strong' },
  { icon: CameraIcon, className: 'bg-category-health-fill text-category-health-strong' },
  { icon: FileTextIcon, className: 'bg-primary text-cta' },
] as const;
const ROLES = ['buyer', 'seller'] as const;
type Role = (typeof ROLES)[number];

export function PhysicalSection() {
  const { t } = useTranslation('home');
  const [role, setRole] = useState<Role>('buyer');
  const price = formatPrice(SERVICE_PRICES.physical.amount, SERVICE_PRICES.physical.currency);
  const steps = t(`physical.journey.${role}`, { returnObjects: true });

  return (
    <section
      id={HOME_SECTION.physical}
      aria-labelledby="physical-title"
      className="bg-card pt-19 pb-20.5"
    >
      <div className="page-wrap">
        <div className="mb-8.75 grid grid-cols-1 gap-4.25 w520:gap-4.75 w900:grid-cols-2 w900:gap-7.5 w1080:grid-cols-[1.08fr_1fr] w1080:gap-18">
          <div className="flex flex-col items-start gap-7">
            <Logo product="physical" size="lg" className="gap-2" />
            <h2
              id="physical-title"
              className="max-w-155 text-[34px] leading-[1.12] font-[740] tracking-[-0.04em] text-foreground w520:text-section-sm"
            >
              <span className="block">{t('physical.titleLead')}</span>
              <span className="block text-category-green">{t('physical.titleAccent')}</span>
            </h2>
            <ul aria-label={t('physical.chipsLabel')} className="flex max-w-155 flex-wrap gap-2.5">
              {PHYSICAL_CHIPS.map((chip) => {
                const Icon = chip.icon;
                return (
                  <li
                    key={chip.key}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-surface-leaf pr-3.5 pl-2.5 text-small font-bold text-brand"
                  >
                    <Icon aria-hidden className="size-4.5 text-category-green" />
                    {t(`physical.chips.${chip.key}`)}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex flex-col items-start gap-7">
            <p className="text-lg leading-[1.55] text-ink-soft w520:text-intro">
              <strong className="font-bold text-brand">{t('physical.leadStrong')}</strong>{' '}
              {t('physical.lead')}
            </p>
            <ProductPriceBox
              product="physical"
              label={t('physical.price.label', { price })}
              kind={t('physical.price.kind')}
              amount={SERVICE_PRICES.physical.amount}
              currency={SERVICE_PRICES.physical.currency}
              footer={
                <span className="flex items-center gap-2">
                  {t('physical.price.include')}
                  <BrandMark product="smartcheck" tone="inverse" size={22} />
                  <Logo
                    product="smartcheck"
                    tone="inverse"
                    size="inline"
                    typeface="body"
                    hasMark={false}
                    isDecorative
                  />
                </span>
              }
              ctaLabel={t('physical.price.cta')}
              ctaHash={HOME_SECTION.pricing}
            />
          </div>
        </div>
        <CriteriaExplorer />
        <div className="pt-16 pb-14">
          <div className="mb-6.25 flex flex-wrap items-center justify-between gap-4 w820:mb-9.5">
            <h3 className="text-[26px] leading-[1.08] font-extrabold tracking-[-0.03em] text-brand w820:text-[36px]">
              {t('physical.journey.title')}
            </h3>
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
              className="gap-1.5 rounded-[10px] border border-border bg-surface-highlight p-1.25"
            >
              {ROLES.map((option) => (
                <ToggleGroupItem
                  key={option}
                  value={option}
                  className="h-11 rounded-[7px] px-4 text-caption font-bold text-brand data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {t(`physical.journey.roles.${option}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <p className="mb-6 flex flex-wrap gap-x-4.5 gap-y-2 text-caption text-muted-foreground">
            <strong className="font-bold text-brand">
              {t('physical.journey.serviceName', { price })}
            </strong>
            <span>{t('physical.journey.serviceText')}</span>
          </p>
          <ol className="relative grid grid-cols-1 gap-4.5 w820:grid-cols-3 w820:gap-7.5 w820:before:absolute w820:before:top-12.25 w820:before:right-34 w820:before:left-34 w820:before:h-0.5 w820:before:bg-category-transport-fill">
            {steps.map((step, index) => {
              const marker = JOURNEY_MARKERS[index] ?? JOURNEY_MARKERS[0];
              const Icon = marker.icon;
              return (
                <li
                  key={`${role}-${String(index)}`}
                  className="relative grid grid-cols-[78px_minmax(0,1fr)] gap-x-2.5 pr-4.5 w820:block"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative row-span-2 grid size-18.5 place-items-center rounded-full border-7 border-card w820:mb-5 w820:size-24.5 w820:border-10',
                      marker.className,
                    )}
                  >
                    <Icon className="size-7 w820:size-8.25" strokeWidth={1.65} />
                    <small className="absolute top-0 -right-0.5 grid size-6.25 place-items-center rounded-full border-2 border-card bg-primary text-[10px] font-[790] text-on-inverse">
                      {String(index + 1).padStart(2, '0')}
                    </small>
                  </span>
                  <h4 className="my-1.25 flex items-end text-[21px] leading-[1.08] font-[710] tracking-[-0.04em] text-foreground w820:mt-0 w820:mb-2.5 w820:min-h-16.75 w820:text-[29px]">
                    {step.title}
                  </h4>
                  <p className="max-w-copy text-caption text-muted-foreground w820:text-small">
                    {step.text}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
        <FindingExample />
      </div>
    </section>
  );
}
