import { Share2Icon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { ReadyReport } from '../../report.types';
import { ReportPdfButton } from '../report-pdf-button';
import { ShareReportDialog } from '../share-report-dialog';

type ReportHeroActionsProps = {
  report: ReadyReport;
  shareToken?: string;
};

export function ReportHeroActions({ report, shareToken }: ReportHeroActionsProps) {
  const { t } = useTranslation('smartCheck');
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2.5 pt-1.5">
      <ReportPdfButton
        variant="cta"
        className="h-12 rounded-md px-5.5 text-body-sm font-bold"
        iconClassName="size-4.5"
        source={
          shareToken === undefined
            ? { pdfPath: report.pdf_path, reportNumber: report.number }
            : { reportId: report.id, shareToken }
        }
      />
      {shareToken === undefined ? (
        <>
          <Button
            variant="outlineInverse"
            className="h-12 rounded-md border-on-inverse/45 px-5.5 text-body-sm font-bold"
            onClick={() => {
              setIsShareOpen(true);
            }}
          >
            <Share2Icon aria-hidden className="size-4.5" />
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
  );
}
