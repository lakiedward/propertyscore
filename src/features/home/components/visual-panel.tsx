import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import { Photo } from '@/components/media/photo';
import { formatNumber } from '@/i18n/format';
import bathImage from '@/assets/home/room-bath.webp';
import bedroomImage from '@/assets/home/room-bedroom.webp';
import livingImage from '@/assets/home/hero-living.webp';
import { PanelIntro } from './panel-intro';

const VISUAL_LINES = [
  { id: 'presentation', tone: 'success' },
  { id: 'findings', tone: 'neutral' },
  { id: 'plan', tone: 'success' },
] as const satisfies readonly { id: string; tone: 'success' | 'neutral' }[];

export function VisualPanel() {
  const { t } = useTranslation('home');

  return (
    <>
      <PanelIntro
        eyebrow={t('deliverables.visual.eyebrow')}
        lead={t('deliverables.visual.titleLead')}
        accent={t('deliverables.visual.titleAccent')}
        text={t('deliverables.visual.text')}
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Photo
            src={livingImage}
            alt={t('deliverables.visual.photos.living')}
            ratio="3/2"
            className="col-span-2"
          />
          <Photo src={bedroomImage} alt={t('deliverables.visual.photos.bedroom')} ratio="4/3" />
          <Photo src={bathImage} alt={t('deliverables.visual.photos.bath')} ratio="4/3" />
        </div>
        <div className="flex flex-col gap-4">
          <ol className="flex flex-col divide-y divide-border-subtle">
            {VISUAL_LINES.map((line, index) => (
              <li
                key={line.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <span className="flex gap-3">
                  <span className="w-6 font-bold text-muted-foreground tabular-nums">
                    {formatNumber(index + 1, { minimumIntegerDigits: 2 })}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-label">
                      {t(`deliverables.visual.lines.${line.id}.title`)}
                    </span>
                    <span className="text-small text-muted-foreground">
                      {t(`deliverables.visual.lines.${line.id}.text`)}
                    </span>
                  </span>
                </span>
                <StatusPill
                  tone={line.tone}
                  label={t(`deliverables.visual.lines.${line.id}.status`)}
                  className="ml-9 sm:ml-0"
                />
              </li>
            ))}
          </ol>
          <p className="text-caption text-muted-foreground">{t('deliverables.visual.note')}</p>
        </div>
      </div>
    </>
  );
}
