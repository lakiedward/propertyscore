import { ArrowRightIcon, ClockIcon, KeyRoundIcon, NavigationIcon, UserIcon } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/i18n/format';
import type { AgendaInspection } from '../inspection.types';
import { directionsUrl, phoneHref } from '../inspection.utils';
import { InspectionStatusPill } from './inspection-status-pill';
import { useAgendaText } from '../hooks/use-agenda-text';

type AgendaCardProps = {
  inspection: AgendaInspection;
  showsDay: boolean;
};

export function AgendaCard({ inspection, showsDay }: AgendaCardProps) {
  const { t } = useTranslation('inspections');
  const { facts, access } = useAgendaText(inspection);
  const titleId = useId();
  const soonId = useId();
  const isDone = inspection.status !== 'inspector_assigned';
  const time = formatDate(
    inspection.starts_at,
    showsDay
      ? { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' },
  );

  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-xl border border-card bg-card p-4.5 shadow-card-soft data-[done=true]:opacity-70"
      data-done={isDone}
    >
      <div className="flex items-center justify-between gap-2.5">
        <strong className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-background px-3 text-[19px] font-extrabold tabular-nums">
          <ClockIcon aria-hidden className="size-4" />
          {time}
        </strong>
        <InspectionStatusPill status={inspection.status} />
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 id={titleId} className="text-[18px] leading-[1.3] font-bold">
          {inspection.address_text}
        </h3>
        <span className="text-small text-muted-foreground">
          {[...facts, t('agenda.number', { number: inspection.number })].join(' · ')}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 text-small">
        {inspection.access_name || inspection.access_phone ? (
          <span className="flex items-center gap-2">
            <UserIcon aria-hidden className="size-4 shrink-0" />
            <span>
              {inspection.access_name}
              {inspection.access_name && inspection.access_phone ? ' · ' : null}
              {inspection.access_phone ? (
                <a
                  href={phoneHref(inspection.access_phone)}
                  className="font-bold text-brand tabular-nums underline-offset-4 hover:underline"
                >
                  {inspection.access_phone}
                </a>
              ) : null}
            </span>
          </span>
        ) : null}
        {access ? (
          <span className="flex items-start gap-2">
            <KeyRoundIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            {access}
          </span>
        ) : null}
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <Button type="button" size="md" disabled aria-describedby={soonId}>
          {t('agenda.start')}
          <ArrowRightIcon aria-hidden />
        </Button>
        <span id={soonId} className="sr-only">
          {t('agenda.startSoon')}
        </span>
        <Button asChild variant="ghost" size="md">
          <a href={directionsUrl(inspection)} target="_blank" rel="noreferrer">
            <NavigationIcon aria-hidden />
            {t('agenda.navigate')}
          </a>
        </Button>
      </div>
    </article>
  );
}
