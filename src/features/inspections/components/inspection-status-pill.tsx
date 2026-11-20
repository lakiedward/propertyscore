import {
  BookCheckIcon,
  CalendarClockIcon,
  CircleDashedIcon,
  CircleXIcon,
  SendIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import type { InspectionStatus } from '../inspection.types';

const STATUS_LOOK = {
  scheduled: { tone: 'info', icon: CalendarClockIcon },
  inspector_assigned: { tone: 'neutral', icon: CircleDashedIcon },
  completed: { tone: 'success', icon: SendIcon },
  book_ready: { tone: 'success', icon: BookCheckIcon },
  cancelled: { tone: 'error', icon: CircleXIcon },
} as const satisfies Record<
  InspectionStatus,
  { tone: 'info' | 'neutral' | 'success' | 'error'; icon: LucideIcon }
>;

type InspectionStatusPillProps = {
  status: InspectionStatus;
};

export function InspectionStatusPill({ status }: InspectionStatusPillProps) {
  const { t } = useTranslation('inspections');
  const { tone, icon } = STATUS_LOOK[status];

  return <StatusPill shape="tag" tone={tone} icon={icon} label={t(`agenda.status.${status}`)} />;
}
