import { ArchiveIcon, CircleCheckIcon, PencilIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/feedback/status-pill';
import type { VersionStatus } from '../inspection-form.types';

type VersionStatusPillProps = {
  status: VersionStatus;
};

export function VersionStatusPill({ status }: VersionStatusPillProps) {
  const { t } = useTranslation('inspectionForm');
  if (status === 'draft') {
    return <StatusPill tone="info" shape="tag" icon={PencilIcon} label={t('status.draft')} />;
  }
  if (status === 'published') {
    return (
      <StatusPill
        tone="success"
        shape="tag"
        icon={CircleCheckIcon}
        label={t('status.publishedFeminine')}
      />
    );
  }
  return <StatusPill tone="neutral" shape="tag" icon={ArchiveIcon} label={t('status.archived')} />;
}
