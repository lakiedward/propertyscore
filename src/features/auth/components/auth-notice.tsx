import { CircleXIcon, InfoIcon, TriangleAlertIcon, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type NoticeTone = 'error' | 'warning' | 'info';

const TONES: Record<NoticeTone, { box: string; icon: LucideIcon; iconColor: string }> = {
  error: {
    box: 'border-error-border bg-error-surface',
    icon: CircleXIcon,
    iconColor: 'text-destructive',
  },
  warning: {
    box: 'border-warning-border bg-warning-surface',
    icon: TriangleAlertIcon,
    iconColor: 'text-warning',
  },
  info: { box: 'border-info-border bg-info-surface', icon: InfoIcon, iconColor: 'text-info' },
};

type AuthNoticeProps = {
  tone: NoticeTone;
  title?: string;
  children: ReactNode;
};

export function AuthNotice({ tone, title, children }: AuthNoticeProps) {
  const { box, icon: Icon, iconColor } = TONES[tone];

  return (
    <Alert
      role={tone === 'info' ? 'status' : 'alert'}
      className={cn(
        'grid-cols-[20px_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg px-4 py-3.5 text-[15px] leading-normal text-foreground',
        box,
      )}
    >
      <Icon aria-hidden className={cn('mt-0.5 size-5', title ? 'row-span-2' : '', iconColor)} />
      {title ? <p className="font-bold">{title}</p> : null}
      <div>{children}</div>
    </Alert>
  );
}
