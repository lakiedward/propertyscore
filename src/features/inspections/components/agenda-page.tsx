import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { NavigationIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatDate } from '@/i18n/format';
import { oneOf } from '@/lib/utils';
import { inspectionQueries } from '../api/inspections.queries';
import { useAgendaText } from '../hooks/use-agenda-text';
import { AGENDA_DAYS, type AgendaInspection } from '../inspection.types';
import {
  agendaDayBounds,
  agendaRange,
  directionsUrl,
  inspectionsOn,
  nextInspection,
} from '../inspection.utils';
import { AgendaCard } from './agenda-card';
import { AgendaStartButton } from './agenda-start-button';
import { AgendaContact } from './agenda-contact';

const route = getRouteApi('/_authenticated/field/');

export function AgendaPage() {
  const { t } = useTranslation('inspections');
  const { day } = route.useSearch();
  const navigate = route.useNavigate();
  const [now] = useState(() => new Date());
  const { data: inspections } = useSuspenseQuery(inspectionQueries.agenda(agendaRange(now)));
  const shown = inspectionsOn(inspections, day, now);
  const next = nextInspection(inspections, now);
  const bounds = agendaDayBounds(day, now);
  const later = nextInspection(inspections, now, bounds.to);
  const titleId = useId();

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <NextInspection inspection={next} now={now} />
        <div className="grid grid-cols-3 gap-3">
          {AGENDA_DAYS.map((statDay) => (
            <div
              key={statDay}
              className="flex flex-col justify-center gap-1 rounded-xl border border-card bg-card p-4 shadow-card-soft"
            >
              <span className="text-caption font-bold text-muted-foreground">
                {t(`agenda.days.${statDay}`)}
              </span>
              <strong className="text-[30px] leading-none font-extrabold tracking-[-0.03em] tabular-nums">
                {inspectionsOn(inspections, statDay, now).length}
              </strong>
              <span className="text-small text-muted-foreground">{t('agenda.statUnit')}</span>
            </div>
          ))}
        </div>
      </div>
      <section aria-labelledby={titleId} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={titleId} className="text-[20px] leading-tight font-bold first-letter:uppercase">
            {day === 'week'
              ? t('agenda.weekRange', {
                  from: formatDate(bounds.from, { day: 'numeric', month: 'short' }),
                  to: formatDate(new Date(bounds.to.getTime() - 1), {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }),
                })
              : formatDate(bounds.from, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
          </h2>
          <ToggleGroup
            type="single"
            value={day}
            onValueChange={(value) => {
              const nextDay = oneOf(AGENDA_DAYS, value);
              if (nextDay) {
                void navigate({ search: { day: nextDay }, replace: true });
              }
            }}
            aria-label={t('agenda.dayLabel')}
            className="gap-0 rounded-md border border-border bg-card p-0.75"
          >
            {AGENDA_DAYS.map((option) => (
              <ToggleGroupItem
                key={option}
                value={option}
                className="touch-target h-7.5 rounded-[6px] px-3 text-caption font-semibold text-brand data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {t(`agenda.days.${option}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        {shown.length === 0 ? (
          <EmptyState
            title={t(day === 'week' ? 'agenda.empty.week' : 'agenda.empty.day')}
            description={
              later
                ? t('agenda.empty.next', {
                    when: formatDate(later.starts_at, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    address: later.address_text,
                  })
                : undefined
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {shown.map((inspection) => (
              <AgendaCard
                key={inspection.id}
                inspection={inspection}
                showsDay={day === 'week'}
                now={now}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type NextInspectionProps = {
  inspection: AgendaInspection | undefined;
  now: Date;
};

function NextInspection({ inspection, now }: NextInspectionProps) {
  const { t } = useTranslation('inspections');

  if (!inspection) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-surface-inverse p-6 text-on-inverse shadow-booking-photo">
        <span className="text-meta font-extrabold tracking-label text-cta uppercase">
          {t('agenda.next.eyebrowEmpty')}
        </span>
        <strong className="text-h3 leading-[1.2] tracking-[-0.02em]">
          {t('agenda.next.emptyTitle')}
        </strong>
        <span className="text-body-sm text-on-photo-faint">{t('agenda.next.emptyText')}</span>
      </div>
    );
  }

  return <NextInspectionCard inspection={inspection} now={now} />;
}

type NextInspectionCardProps = {
  inspection: AgendaInspection;
  now: Date;
};

function NextInspectionCard({ inspection, now }: NextInspectionCardProps) {
  const { t } = useTranslation('inspections');
  const { access } = useAgendaText(inspection);
  const isToday = inspectionsOn([inspection], 'today', now).length > 0;
  const when = formatDate(
    inspection.starts_at,
    isToday
      ? { hour: '2-digit', minute: '2-digit' }
      : { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-surface-inverse p-6 text-on-inverse shadow-booking-photo">
      <span className="text-meta font-extrabold tracking-label text-cta uppercase">
        {t('agenda.next.eyebrow', { when })}
      </span>
      <strong className="text-h3 leading-[1.2] tracking-[-0.02em] text-balance">
        {inspection.address_text}
      </strong>
      <AgendaContact inspection={inspection} access={access} tone="inverse" />
      <div className="mt-auto flex flex-wrap gap-2.5 pt-1">
        <AgendaStartButton inspection={inspection} look="hero" now={now} />
        <Button asChild variant="inverse" size="md">
          <a href={directionsUrl(inspection)} target="_blank" rel="noreferrer">
            <NavigationIcon aria-hidden />
            {t('agenda.navigate')}
          </a>
        </Button>
      </div>
    </div>
  );
}
