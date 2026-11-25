import { Link } from '@tanstack/react-router';
import {
  ArrowRightIcon,
  ChartNoAxesColumnIcon,
  CircleXIcon,
  CreditCardIcon,
  FileCheckIcon,
  HourglassIcon,
  LoaderCircleIcon,
  Share2Icon,
  type LucideIcon,
} from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import { ScoreValue } from '@/components/trust/score-value';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/i18n/format';
import type { Enums } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';
import type { listMyReports } from '../api/smart-check.api';
import { REPORT_STATUS_TONE } from '../report-status.utils';
import { ReportPdfButton } from './report-pdf-button';
import { ShareReportDialog } from './share-report-dialog';

type MyReport = Awaited<ReturnType<typeof listMyReports>>['items'][number];

type ReportStatus = Enums<'online_report_status'>;

const STATUS_ICON = {
  pending_payment: CreditCardIcon,
  queued: HourglassIcon,
  generating: LoaderCircleIcon,
  ready: FileCheckIcon,
  failed: CircleXIcon,
} as const satisfies Record<ReportStatus, LucideIcon>;

type MyReportCardProps = {
  report: MyReport;
};

export function MyReportCard({ report }: MyReportCardProps) {
  const { t } = useTranslation('smartCheck');
  const titleId = useId();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const isReady = report.status === 'ready';

  return (
    <article
      aria-labelledby={titleId}
      className="grid overflow-hidden rounded-xl border border-card bg-card shadow-card-soft sm:grid-cols-[200px_minmax(0,1fr)]"
    >
      <ReportVisual report={report} />
      <div className="flex min-w-0 flex-col gap-2.5 px-5 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2
              id={titleId}
              className="text-card-title leading-tight font-bold tracking-snug-title text-foreground"
            >
              {report.address_text}
            </h2>
            <p className="text-small text-muted-foreground tabular-nums">
              {t('myReports.meta', {
                number: report.number,
                date: formatDate(report.generated_at ?? report.created_at),
              })}
            </p>
          </div>
          <StatusPill
            shape="tag"
            tone={REPORT_STATUS_TONE[report.status]}
            icon={STATUS_ICON[report.status]}
            label={t(`status.${report.status}`)}
          />
        </div>
        <p className="text-small text-muted-foreground">{t(`myReports.note.${report.status}`)}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm">
            <Link to="/check/result/$reportId" params={{ reportId: report.id }}>
              {t('myReports.open')}
              <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
          {isReady ? (
            <>
              <ReportPdfButton
                variant="secondary"
                size="sm"
                source={{ pdfPath: report.pdf_path, reportNumber: report.number }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsShareOpen(true);
                }}
              >
                <Share2Icon aria-hidden />
                {t('report.share.action')}
              </Button>
              <ShareReportDialog
                reportId={report.id}
                isOpen={isShareOpen}
                onOpenChange={setIsShareOpen}
              />
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ReportVisual({ report }: MyReportCardProps) {
  const { t } = useTranslation('smartCheck');
  const StatusIcon = STATUS_ICON[report.status];
  const score =
    report.status === 'ready' && report.overall_score !== null ? report.overall_score : null;

  return (
    <div className="relative flex min-h-40 items-center justify-center bg-report-hero px-4 pt-12 pb-5 text-on-inverse">
      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1.25 text-meta font-extrabold text-report-hero">
        <ChartNoAxesColumnIcon aria-hidden className="size-3.5" />
        {t('myReports.kind')}
      </span>
      {score === null ? (
        <StatusIcon
          aria-hidden
          className={cn(
            'size-10 text-on-inverse/70',
            report.status === 'generating' && 'motion-safe:animate-spin',
          )}
        />
      ) : (
        <ScoreValue
          variant="stroke"
          size="lg"
          hue="onInverse"
          value={score}
          label={t('myReports.scoreLabel', { score })}
          caption={t('report.frame.outOf')}
          className="size-26"
        />
      )}
    </div>
  );
}
