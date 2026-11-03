import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import { formatNumber } from '@/i18n/format';
import windowImage from '@/assets/home/inspection-window.webp';
import { PanelIntro } from './panel-intro';

const REPORT_LINES = [
  { id: 'windows', tone: 'neutral' },
  { id: 'heating', tone: 'warning' },
  { id: 'floor', tone: 'info' },
] as const satisfies readonly { id: string; tone: 'neutral' | 'warning' | 'info' }[];

export function ReportPanel() {
  const { t } = useTranslation('home');

  return (
    <>
      <PanelIntro
        eyebrow={t('deliverables.report.eyebrow')}
        lead={t('deliverables.report.titleLead')}
        accent={t('deliverables.report.titleAccent')}
        text={t('deliverables.report.text')}
      />
      <div className="grid grid-cols-1 gap-7 w820:grid-cols-[0.84fr_1.16fr]">
        <figure className="relative min-h-90 overflow-hidden rounded-icon bg-surface-alt">
          <img
            src={windowImage}
            alt={t('deliverables.report.photoAlt')}
            width={1536}
            height={1024}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
          <figcaption className="absolute bottom-3 left-3 rounded-[5px] bg-photo-note px-2.5 py-1.75 text-micro leading-normal font-[650] text-foreground">
            {t('deliverables.report.photoCaption')}
          </figcaption>
        </figure>
        <div>
          <div className="mb-3.25 flex items-center justify-between gap-3.5 text-meta text-brand">
            <p className="font-bold">{t('deliverables.report.listTitle')}</p>
            <p className="text-micro text-muted-foreground">{t('deliverables.report.listDate')}</p>
          </div>
          <ol className="border-t border-border">
            {REPORT_LINES.map((line, index) => (
              <li
                key={line.id}
                className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-start gap-2.75 border-b border-border py-3.5"
              >
                <span className="grid size-8.5 place-items-center rounded-full bg-surface-alt text-meta font-extrabold text-brand tabular-nums">
                  {formatNumber(index + 1, { minimumIntegerDigits: 2 })}
                </span>
                <span className="flex flex-col">
                  <span className="text-small font-bold text-foreground">
                    {t(`deliverables.report.lines.${line.id}.title`)}
                  </span>
                  <span className="mt-0.5 text-meta text-muted-foreground">
                    {t(`deliverables.report.lines.${line.id}.text`)}
                  </span>
                </span>
                <StatusPill
                  tone={line.tone}
                  label={t(`deliverables.report.lines.${line.id}.status`)}
                />
              </li>
            ))}
          </ol>
          <div className="mt-3.75 rounded-md bg-surface-leaf px-4 py-3.5">
            <p className="text-meta font-bold text-brand">{t('deliverables.report.boxTitle')}</p>
            <p className="mt-1.25 max-w-113.5 text-meta leading-[1.65] text-muted-foreground">
              {t('deliverables.report.boxText')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
