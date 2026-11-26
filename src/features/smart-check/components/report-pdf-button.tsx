import { FileDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SUPPORTED_LOCALES, type Locale } from '@/i18n/i18n';
import { isAppError } from '@/lib/errors';
import { useReportPdfUrl } from '../api/smart-check.queries';
import { startDownload } from '../report-pdf.utils';

type ReportPdfButtonsProps = Pick<
  ComponentProps<typeof Button>,
  'variant' | 'size' | 'className'
> & {
  reportId: string;
  shareToken?: string;
  iconClassName?: string;
};

export function ReportPdfButtons(props: ReportPdfButtonsProps) {
  return SUPPORTED_LOCALES.map((locale) => (
    <ReportPdfButton key={locale} {...props} locale={locale} />
  ));
}

function ReportPdfButton({
  reportId,
  shareToken,
  locale,
  iconClassName,
  ...buttonProps
}: ReportPdfButtonsProps & { locale: Locale }) {
  const { t } = useTranslation('smartCheck');
  const pdfUrl = useReportPdfUrl();

  const handleDownload = () => {
    pdfUrl.mutate(
      { reportId, token: shareToken, locale },
      {
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
      },
    );
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
      {pdfUrl.isPending ? t(`report.pdf.preparing.${locale}`) : t(`report.pdf.download.${locale}`)}
    </Button>
  );
}
