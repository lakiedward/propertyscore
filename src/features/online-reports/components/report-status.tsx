import { Link } from '@tanstack/react-router';
import { ClockIcon, LoaderCircleIcon, TriangleAlertIcon, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PendingStatus = 'pending_payment' | 'generating' | 'failed';

const STATUS_VIEW: Readonly<
  Record<
    PendingStatus,
    {
      icon: LucideIcon;
      role: 'status' | 'alert';
      title: 'pendingPaymentTitle' | 'generatingTitle' | 'failedTitle';
      body: 'pendingPaymentBody' | 'generatingBody' | 'failedBody';
      pill: 'pendingPayment' | 'generating' | 'failed';
      tone: 'info' | 'warning';
      iconClass: string;
    }
  >
> = {
  pending_payment: {
    icon: ClockIcon,
    role: 'status',
    title: 'pendingPaymentTitle',
    body: 'pendingPaymentBody',
    pill: 'pendingPayment',
    tone: 'info',
    iconClass: 'text-info',
  },
  generating: {
    icon: LoaderCircleIcon,
    role: 'status',
    title: 'generatingTitle',
    body: 'generatingBody',
    pill: 'generating',
    tone: 'info',
    iconClass: 'animate-spin text-info motion-reduce:animate-none',
  },
  failed: {
    icon: TriangleAlertIcon,
    role: 'alert',
    title: 'failedTitle',
    body: 'failedBody',
    pill: 'failed',
    tone: 'warning',
    iconClass: 'text-destructive',
  },
};

type ReportStatusProps = {
  status: PendingStatus;
  addressText: string;
};

export function ReportStatus({ status, addressText }: ReportStatusProps) {
  const { t } = useTranslation('onlineReports');
  const view = STATUS_VIEW[status];
  const Icon = view.icon;

  return (
    <section
      role={view.role}
      className="mx-auto flex min-h-[60svh] max-w-narrow flex-col items-center justify-center gap-4 px-gutter py-16 text-center"
    >
      <Icon aria-hidden className={cn('size-8', view.iconClass)} />
      <StatusPill tone={view.tone} label={t(`status.pill.${view.pill}`)} />
      <p className="text-caption">{addressText}</p>
      <h1 className="text-h2">{t(`status.${view.title}`)}</h1>
      <p className="text-lead">{t(`status.${view.body}`)}</p>
      <Button asChild variant="outline">
        <Link to="/">{t('status.backHome')}</Link>
      </Button>
    </section>
  );
}
