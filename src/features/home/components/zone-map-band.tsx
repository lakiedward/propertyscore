import { cva } from 'class-variance-authority';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { safetyFactorsWith, type SafetyEffect } from '../data/zone-map-example';
import { SectionTitle } from './section-title';
import { ZoneMapExample } from './zone-map-example';

export function ZoneMapBand() {
  const { t } = useTranslation('home');

  return (
    <div className="bg-surface-online-inverse py-18 text-on-inverse w960:py-24">
      <div className="page-wrap grid grid-cols-1 items-center gap-[clamp(40px,6vw,96px)] w960:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div>
          <p className="flex items-center gap-2.25 text-meta font-display tracking-[0.025em] text-cta">
            <span aria-hidden="true" className="size-2 rounded-full bg-cta" />
            {t('smartCheck.map.eyebrow')}
          </p>
          <SectionTitle
            as="h3"
            size="band"
            className="mt-4 mb-4.5 text-on-inverse"
            accentClassName="text-cta"
            lead={t('smartCheck.map.titleLead')}
            accent={t('smartCheck.map.titleAccent')}
          />
          <p className="max-w-copy text-lead-sm leading-[1.65] text-on-info-muted">
            {t('smartCheck.map.text')}
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 border-t border-on-inverse/16 pt-7 w520:grid-cols-2">
            <FactorList title={t('smartCheck.map.upTitle')} effect="up" />
            <FactorList title={t('smartCheck.map.downTitle')} effect="down" />
          </div>
        </div>
        <ZoneMapExample />
      </div>
    </div>
  );
}

const effectBadgeVariants = cva('grid size-6 place-items-center rounded-full text-info-ink', {
  variants: {
    effect: { up: 'bg-map-safety-up-soft', down: 'bg-map-safety-down-soft' },
  },
});

const EFFECT_ICON = { up: PlusIcon, down: MinusIcon } as const;

type FactorListProps = { title: string; effect: SafetyEffect };

function FactorList({ title, effect }: FactorListProps) {
  const { t } = useTranslation('home');
  const Icon = EFFECT_ICON[effect];

  return (
    <div>
      <p className="flex items-center gap-2.5 text-label font-bold">
        <span aria-hidden="true" className={effectBadgeVariants({ effect })}>
          <Icon className="size-3.5" strokeWidth={3} />
        </span>
        {title}
      </p>
      <ul className="mt-3.5 flex flex-col gap-2.5">
        {safetyFactorsWith(effect).map((factor) => (
          <li key={factor} className="pl-8.5 text-label font-normal text-info-surface">
            {t(`smartCheck.map.factors.${factor}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
