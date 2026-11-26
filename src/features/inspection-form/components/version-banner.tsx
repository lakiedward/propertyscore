import { ArrowLeftIcon, EyeIcon, RotateCcwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { VersionItem } from '../inspection-form.types';
import { VersionStatusPill } from './version-status-pill';

type VersionBannerProps = {
  item: VersionItem;
  backLabel: string;
  onBack: () => void;
  onRestore: () => void;
};

export function VersionBanner({ item, backLabel, onBack, onRestore }: VersionBannerProps) {
  const { t } = useTranslation('inspectionForm');

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-info-border bg-info-surface px-4 py-3.5"
    >
      <EyeIcon aria-hidden className="size-5 shrink-0 text-info" />
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <strong className="text-base font-extrabold">
            {t('versions.banner.title', { version: item.label })}
          </strong>
          <VersionStatusPill status={item.status} />
        </span>
        <span className="text-small text-muted-foreground">
          {t('versions.banner.text')}{' '}
          {item.inspectionCount > 0
            ? t('versions.usedIn', { count: item.inspectionCount })
            : t('versions.unused')}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="md" onClick={onBack}>
          <ArrowLeftIcon aria-hidden />
          {backLabel}
        </Button>
        <Button type="button" size="md" onClick={onRestore}>
          <RotateCcwIcon aria-hidden />
          {t('versions.restore')}
        </Button>
      </div>
    </div>
  );
}
