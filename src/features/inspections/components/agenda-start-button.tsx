import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/i18n/format';
import { bucharestDay, canStartAt, startWindowOpensAt } from '@/lib/bucharest-time';
import { cn } from '@/lib/utils';
import type { AgendaInspection } from '../inspection.types';

const TIME = { hour: '2-digit', minute: '2-digit' } as const;

type AgendaStartButtonProps = {
  inspection: AgendaInspection;
  look: 'card' | 'hero';
  now: Date;
};

export function AgendaStartButton({ inspection, look, now }: AgendaStartButtonProps) {
  const { t } = useTranslation('inspections');
  const isHero = look === 'hero';
  const variant = isHero ? 'cta' : 'default';
  const size = 'md';

  if (
    inspection.status === 'in_progress' ||
    (inspection.status === 'inspector_assigned' && canStartAt(inspection.starts_at, now))
  ) {
    const isContinue = inspection.status === 'in_progress';
    return (
      <Button asChild variant={variant} size={size} className={cn(!isHero && 'w-full')}>
        <Link
          to="/field/inspections/$inspectionId"
          params={{ inspectionId: inspection.id }}
          search={{}}
        >
          {isContinue
            ? t(isHero ? 'agenda.next.continue' : 'agenda.continue')
            : t(isHero ? 'agenda.next.start' : 'agenda.start')}
          <ArrowRightIcon aria-hidden />
        </Link>
      </Button>
    );
  }

  const isSent = inspection.status === 'completed' || inspection.status === 'book_ready';
  const startsFrom = startWindowOpensAt(inspection.starts_at);
  const isSameDay = bucharestDay(startsFrom) === bucharestDay(now);

  return (
    <Button
      type="button"
      variant={isHero ? 'outlineInverse' : 'default'}
      size={size}
      disabled
      className={cn(
        !isHero && 'w-full',
        isHero
          ? 'disabled:border-dashed disabled:border-on-inverse/35 disabled:bg-transparent disabled:text-on-inverse-muted'
          : 'disabled:border-dashed disabled:border-border-strong disabled:bg-card disabled:text-muted-foreground',
      )}
    >
      {isSent
        ? t('agenda.sent', {
            time: inspection.submitted_at ? formatDate(inspection.submitted_at, TIME) : '',
          })
        : t(isHero ? 'agenda.next.start' : 'agenda.start')}
      {isSent ? null : (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-meta font-bold',
            isHero ? 'bg-on-inverse/12 text-cta' : 'bg-surface-alt text-brand',
          )}
        >
          {t('agenda.startsFrom', {
            time: formatDate(
              startsFrom,
              isSameDay ? TIME : { weekday: 'short', hour: '2-digit', minute: '2-digit' },
            ),
          })}
        </span>
      )}
    </Button>
  );
}
