import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckIcon,
  MapPinIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SummaryItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  isDone: boolean;
};

type NextAction =
  | { kind: 'submit'; formId: string }
  | { kind: 'click'; onClick: () => void; isDisabled: boolean; blockedHint: string };

type BookingSummaryBarProps = {
  items: readonly SummaryItem[] | null;
  nextName: string | null;
  nextLabel: string | null;
  next: NextAction | null;
  onBack: (() => void) | null;
};

export function BookingSummaryBar({
  items,
  nextName,
  nextLabel,
  next,
  onBack,
}: BookingSummaryBarProps) {
  const { t } = useTranslation('inspections');
  const isDisabled = next?.kind === 'click' && next.isDisabled;

  return (
    <section
      aria-label={t('booking.summary.label')}
      className="bottom-3 z-5 flex flex-wrap items-center gap-x-6 gap-y-3.5 rounded-photo border border-card bg-card px-3.5 py-3.5 shadow-booking-bar sm:px-5 md:sticky"
    >
      {items ? (
        <ol
          aria-label={t('booking.summary.listLabel')}
          className="grid min-w-0 flex-[1_1_520px] gap-x-5 gap-y-2.5 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]"
        >
          {items.map(({ key, icon: Icon, label, value, isDone }) => (
            <li key={key} className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  'grid size-8.5 shrink-0 place-items-center rounded-full',
                  isDone ? 'bg-primary text-cta' : 'bg-surface-alt text-muted-foreground',
                )}
              >
                {isDone ? (
                  <CheckIcon aria-hidden className="size-4" />
                ) : (
                  <Icon aria-hidden className="size-4" />
                )}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-meta text-muted-foreground">{label}</span>
                <strong
                  className={cn(
                    'truncate text-small leading-[1.3] first-letter:uppercase',
                    isDone ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {value}
                </strong>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      {nextName ? (
        <span className="flex-[1_1_200px] text-small text-muted-foreground">
          {t('booking.summary.next', { step: nextName })}
        </span>
      ) : null}
      <div className="ml-auto flex flex-[1_1_100%] items-center justify-end gap-2.5 sm:flex-none">
        {onBack ? (
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeftIcon aria-hidden />
            {t('booking.summary.back')}
          </Button>
        ) : null}
        {next && nextLabel ? (
          <div className="flex flex-col items-end gap-1">
            {next.kind === 'submit' ? (
              <Button type="submit" form={next.formId} size="lg">
                {nextLabel}
                <ArrowRightIcon aria-hidden />
              </Button>
            ) : (
              <Button type="button" size="lg" disabled={next.isDisabled} onClick={next.onClick}>
                {nextLabel}
                <ArrowRightIcon aria-hidden />
              </Button>
            )}
            {isDisabled ? (
              <span className="text-meta text-muted-foreground">{next.blockedHint}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export const SUMMARY_ICONS = {
  address: MapPinIcon,
  date: CalendarDaysIcon,
  opener: UserIcon,
} as const;
