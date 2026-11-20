import {
  BookCheckIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CheckIcon,
  CircleDashedIcon,
  CircleXIcon,
  SendIcon,
  UserCheckIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import type { InspectionStatus } from '../inspection.types';

type Look = { tone: 'info' | 'neutral' | 'success' | 'error'; icon: LucideIcon };

const INSPECTOR_LOOK = {
  scheduled: { tone: 'info', icon: CalendarClockIcon },
  inspector_assigned: { tone: 'neutral', icon: CircleDashedIcon },
  completed: { tone: 'success', icon: SendIcon },
  book_ready: { tone: 'success', icon: BookCheckIcon },
  cancelled: { tone: 'error', icon: CircleXIcon },
} as const satisfies Record<InspectionStatus, Look>;

const CLIENT_LOOK = {
  scheduled: { tone: 'info', icon: CalendarCheckIcon },
  inspector_assigned: { tone: 'info', icon: UserCheckIcon },
  completed: { tone: 'neutral', icon: CheckIcon },
  book_ready: { tone: 'success', icon: BookCheckIcon },
  cancelled: { tone: 'error', icon: CircleXIcon },
} as const satisfies Record<InspectionStatus, Look>;

type InspectionStatusPillProps = {
  status: InspectionStatus;
  audience?: 'inspector' | 'client';
};

export function InspectionStatusPill({
  status,
  audience = 'inspector',
}: InspectionStatusPillProps) {
  const { t } = useTranslation('inspections');
  const { tone, icon } = (audience === 'client' ? CLIENT_LOOK : INSPECTOR_LOOK)[status];
  const label =
    audience === 'client' ? t(`appointments.status.${status}`) : t(`agenda.status.${status}`);

  return <StatusPill shape="tag" tone={tone} icon={icon} label={label} />;
}
