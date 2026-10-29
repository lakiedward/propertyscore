import { CloudCheckIcon, KeyRoundIcon, MoveIcon, SendIcon, TagIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '@/i18n/format';
import { cn } from '@/lib/utils';
import heroImage from '@/assets/home/hero-living.webp';
import inspectionImage from '@/assets/home/inspection-window.webp';
import bedroomImage from '@/assets/home/room-bedroom.webp';
import { HERO_LISTING } from '../publish.example';
import { PUBLISH_STEPS, type PublishStepKey } from '../publish.steps';
import { ExampleLocationMap } from './example-location-map';

const PHOTO_GRID = [
  { key: 'cover', src: heroImage },
  { key: 'bedroom', src: bedroomImage },
  { key: 'inspection', src: inspectionImage },
  { key: 'bedroom-2', src: bedroomImage },
  { key: 'living-2', src: heroImage },
  { key: 'inspection-2', src: inspectionImage },
] as const;

type StepPreviewProps = {
  stepKey: PublishStepKey;
  stepIndex: number;
};

export function StepPreview({ stepKey, stepIndex }: StepPreviewProps) {
  const { t } = useTranslation('publish');

  return (
    <div className="flex flex-col justify-center gap-3.5 rounded-xl bg-card p-5.5 shadow-preview">
      <p className="sr-only">
        {t('steps.preview.summary', { step: t(`steps.items.${stepKey}.title`) })}
      </p>
      <div aria-hidden="true" className="contents">
        <span className="flex items-center justify-between text-meta leading-[1.55] font-extrabold">
          <span className="text-muted-foreground">{t('steps.preview.newListing')}</span>
          <span className="flex items-center gap-1 text-step-aqua-solid">
            <CloudCheckIcon className="size-3.5" />
            {t('steps.preview.saved')}
          </span>
        </span>
        <span className="grid grid-cols-6 gap-1">
          {PUBLISH_STEPS.map((step, index) => (
            <span
              key={step.key}
              className={cn(
                'h-1.25 rounded-full',
                index <= stepIndex ? 'bg-primary' : 'bg-secondary',
              )}
            />
          ))}
        </span>
        <PreviewBody stepKey={stepKey} />
      </div>
    </div>
  );
}

function PreviewBody({ stepKey }: { stepKey: PublishStepKey }) {
  const { t } = useTranslation('publish');

  switch (stepKey) {
    case 'type':
      return (
        <>
          <span className="grid grid-cols-2 gap-2.5">
            <span className="flex flex-col items-center gap-2 rounded-icon border-2 border-primary bg-step-leaf-soft px-2.5 py-5.5 text-body font-extrabold text-foreground">
              <TagIcon className="size-6.5" />
              {t('steps.preview.sale')}
            </span>
            <span className="flex flex-col items-center gap-2 rounded-icon border-[1.5px] border-border px-2.5 py-5.5 text-body font-extrabold text-muted-foreground">
              <KeyRoundIcon className="size-6.5" />
              {t('steps.preview.rent')}
            </span>
          </span>
          <span className="flex items-center justify-between rounded-md border-[1.5px] border-border px-3.5 py-3">
            <span className="text-small text-muted-foreground">
              {t('steps.preview.totalPrice')}
            </span>
            <strong className="text-body font-bold text-foreground tabular-nums">
              {formatPrice(HERO_LISTING.price, HERO_LISTING.currency)}
            </strong>
          </span>
        </>
      );
    case 'photos':
      return (
        <>
          <span className="grid grid-cols-3 gap-2">
            {PHOTO_GRID.map((photo) => (
              <span
                key={photo.key}
                className={cn(
                  'relative aspect-4/3 overflow-hidden rounded-md',
                  photo.key === 'cover' && 'outline-2 outline-cta',
                )}
              >
                <img src={photo.src} alt="" className="size-full object-cover" />
                {photo.key === 'cover' ? (
                  <span className="absolute top-1 left-1 rounded-sm bg-cta px-1.5 py-0.5 text-[10px] leading-[1.55] font-extrabold text-brand">
                    {t('steps.preview.cover')}
                  </span>
                ) : null}
              </span>
            ))}
          </span>
          <PreviewNote icon={<MoveIcon />}>{t('steps.preview.dragToSort')}</PreviewNote>
        </>
      );
    case 'description':
      return (
        <>
          <PreviewField label={t('steps.preview.titleLabel')} isFocused>
            {t('steps.preview.titleValue')}
          </PreviewField>
          <PreviewField label={t('steps.preview.descriptionLabel')} isMuted>
            {t('steps.preview.descriptionValue')}
          </PreviewField>
        </>
      );
    case 'details':
      return (
        <span className="grid grid-cols-2 gap-2">
          <PreviewFact label={t('steps.preview.facts.surface')}>
            {t('steps.preview.surfaceValue', { value: HERO_LISTING.surface })}
          </PreviewFact>
          <PreviewFact label={t('steps.preview.facts.rooms')}>
            {String(HERO_LISTING.rooms)}
          </PreviewFact>
          <PreviewFact label={t('steps.preview.facts.floor')}>
            {t('steps.preview.floorValue', {
              floor: HERO_LISTING.floor,
              floors: HERO_LISTING.floors,
            })}
          </PreviewFact>
          <PreviewFact label={t('steps.preview.facts.year')}>
            {String(HERO_LISTING.year)}
          </PreviewFact>
        </span>
      );
    case 'location':
      return (
        <>
          <ExampleLocationMap />
          <PreviewNote>{t('steps.preview.mapNote')}</PreviewNote>
        </>
      );
    case 'contact':
      return (
        <>
          <PreviewField label={t('steps.preview.phoneLabel')}>
            <span className="font-bold text-foreground tabular-nums">
              {t('steps.preview.phoneValue')}
            </span>
          </PreviewField>
          <span className="flex h-12 items-center justify-center gap-2 rounded-md bg-cta text-body font-extrabold text-brand">
            <SendIcon className="size-4" />
            {t('steps.preview.submit')}
          </span>
          <PreviewNote>{t('steps.preview.submitNote')}</PreviewNote>
        </>
      );
  }
}

function PreviewField({
  label,
  isFocused = false,
  isMuted = false,
  children,
}: {
  label: string;
  isFocused?: boolean;
  isMuted?: boolean;
  children: ReactNode;
}) {
  return (
    <span className="flex flex-col gap-1">
      <span className="text-meta leading-[1.4] text-muted-foreground">{label}</span>
      <span
        className={cn(
          'rounded-md border-[1.5px] px-3.5 py-3',
          isFocused ? 'border-primary' : 'border-border',
          isMuted
            ? 'text-small leading-normal text-muted-foreground'
            : 'text-body font-bold text-foreground',
        )}
      >
        {children}
      </span>
    </span>
  );
}

function PreviewFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex flex-col gap-0.5 rounded-md border-[1.5px] border-border px-3 py-2.5">
      <span className="text-meta leading-[1.4] text-muted-foreground">{label}</span>
      <strong className="text-body font-bold text-foreground tabular-nums">{children}</strong>
    </span>
  );
}

function PreviewNote({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-small leading-normal text-muted-foreground [&_svg]:size-3.5">
      {icon}
      {children}
    </span>
  );
}
