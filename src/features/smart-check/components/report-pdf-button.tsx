import { FileDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { isAppError } from '@/lib/errors';
import { useReportPdfUrl, type ReportPdfRequest } from '../api/smart-check.queries';
import { startDownload } from '../report-pdf.utils';

type ReportPdfSource =
  ReportPdfRequest | { pdfPath: null; reportNumber: number; reportId?: never; shareToken?: never };

type ReportPdfButtonProps = Pick<
  ComponentProps<typeof Button>,
  'variant' | 'size' | 'className'
> & {
  source: ReportPdfSource;
  iconClassName?: string;
};

export function ReportPdfButton({ source, iconClassName, ...buttonProps }: ReportPdfButtonProps) {
  const { t } = useTranslation('smartCheck');
  const pdfUrl = useReportPdfUrl();

  const handleDownload = () => {
    const request =
      source.shareToken !== undefined
        ? { reportId: source.reportId, shareToken: source.shareToken }
        : source.pdfPath === null
          ? null
          : { pdfPath: source.pdfPath, reportNumber: source.reportNumber };
    if (!request) {
      toast.info(t('report.pdf.missing'));
      return;
    }
    pdfUrl.mutate(request, {
      onSuccess: (url) => {
        startDownload(url);
      },
      onError: (error) => {
        if (isAppError(error) && error.code === 'not_found') {
          toast.info(t('report.pdf.missing'));
          return;
        }
        toast.error(t('report.pdf.failed'));
      },
    });
  };

  return (
    <Button
      type="button"
      {...buttonProps}
      disabled={pdfUrl.isPending}
      aria-busy={pdfUrl.isPending}
      onClick={handleDownload}
    >
      <FileDownIcon aria-hidden className={iconClassName} />
      {pdfUrl.isPending ? t('report.pdf.preparing') : t('report.pdf.download')}
    </Button>
  );
}
