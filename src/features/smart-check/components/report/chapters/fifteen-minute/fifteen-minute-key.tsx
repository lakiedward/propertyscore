import { useTranslation } from 'react-i18next';
import { FAMILIES, FAMILY_STYLES, WALK_LIMIT_MIN } from '../../../../fifteen-minute.utils';

export function FifteenMinuteKey() {
  const { t } = useTranslation('smartCheck');
  return (
    <div className="pointer-events-none absolute bottom-8 left-2.5 z-3 grid gap-1 rounded-[10px] border border-border bg-card/96 px-3 py-2 text-[12px] leading-[1.55] text-muted-foreground shadow-report-label w560:bottom-2.5">
      <b className="text-foreground">{t('report.chapters.fifteenMinute.map.key.title')}</b>
      <span className="flex items-center gap-2">
        <i aria-hidden="true" className="size-2.5 rounded-full bg-primary" />
        {t('report.chapters.fifteenMinute.map.key.address')}
      </span>
      <span className="flex items-center gap-2">
        <i
          aria-hidden="true"
          className="h-2 w-4.5 rounded-xs border-[1.5px] border-report-fifteen-minute/70 bg-report-fifteen-minute/16"
        />
        {t('report.chapters.fifteenMinute.map.key.zone', { limit: WALK_LIMIT_MIN })}
      </span>
      <span className="flex items-center gap-1">
        {FAMILIES.map((family) => (
          <i
            key={family}
            aria-hidden="true"
            style={{ background: `var(${FAMILY_STYLES[family].color})` }}
            className="size-2 rounded-full"
          />
        ))}
        <span className="ml-1">{t('report.chapters.fifteenMinute.map.key.places')}</span>
      </span>
    </div>
  );
}
