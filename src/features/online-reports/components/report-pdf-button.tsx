import { DownloadIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function ReportPdfButton() {
  const { t } = useTranslation('onlineReports');

  return (
    <Button
      variant="inverseInfo"
      size="sm"
      shape="pill"
      title={t('pdf.hint')}
      onClick={() => {
        toast.info(t('pdf.hint'));
        window.print();
      }}
    >
      <DownloadIcon aria-hidden />
      {t('pdf.download')}
    </Button>
  );
}
