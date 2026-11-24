import { ClockIcon, NavigationIcon } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/i18n/format';
import type { AgendaInspection } from '../inspection.types';
import { directionsUrl } from '../inspection.utils';
import { AgendaContact } from './agenda-contact';
import { AgendaStartButton } from './agenda-start-button';
import { InspectionStatusPill } from './inspection-status-pill';
import { useAgendaText } from '../hooks/use-agenda-text';

type AgendaCardProps = {
  inspection: AgendaInspection;
  showsDay: boolean;
  now: Date;
};

export function AgendaCard({ inspection, showsDay, now }: AgendaCardProps) {
  const { t } = useTranslation('inspections');
  const { facts, access } = useAgendaText(inspection);
  const titleId = useId();
  const isDone = inspection.status !== 'inspector_assigned' && inspection.status !== 'in_progress';
  const time = formatDate(
    inspection.starts_at,
    showsDay
      ? { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' },
  );

  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col overflow-hidden rounded-xl border border-card bg-card shadow-card-soft data-[done=true]:opacity-70"
      data-done={isDone}
    >
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-icon bg-surface-alt text-brand max-w480:hidden">
              <ClockIcon aria-hidden className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col">
              <strong className="text-[21px] leading-tight font-extrabold tracking-[-0.02em] whitespace-nowrap tabular-nums first-letter:uppercase">
                {time}
              </strong>
              <span className="text-caption text-muted-foreground tabular-nums">
                {t('agenda.number', { number: inspection.number })}
              </span>
            </span>
          </div>
          <span className="shrink-0 whitespace-nowrap">
            <InspectionStatusPill
              status={inspection.status}
              label={
                inspection.status === 'in_progress'
                  ? t('agenda.inProgress', {
                      answered: inspection.answered_count,
                      total: inspection.question_count,
                    })
                  : undefined
              }
            />
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h3 id={titleId} className="text-[18px] leading-[1.3] font-bold text-balance">
            {inspection.address_text}
          </h3>
          <span className="text-small text-muted-foreground">{facts.join(' · ')}</span>
        </div>
        <AgendaContact inspection={inspection} access={access} tone="light" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 border-t border-border-subtle px-5 py-4">
        <Button asChild variant="outline" size="md" className="w-full">
          <a href={directionsUrl(inspection)} target="_blank" rel="noreferrer">
            <NavigationIcon aria-hidden />
            {t('agenda.navigate')}
          </a>
        </Button>
        <AgendaStartButton inspection={inspection} look="card" now={now} />
      </div>
    </article>
  );
}
