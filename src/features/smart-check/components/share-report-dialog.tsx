import { useQuery } from '@tanstack/react-query';
import { CopyIcon, LinkIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { env } from '@/config/env';
import { formatDate } from '@/i18n/format';
import {
  smartCheckQueries,
  useCreateShareLink,
  useRevokeShareLink,
} from '../api/smart-check.queries';
import {
  isShareExpiryOption,
  SHARE_EXPIRY_OPTIONS,
  sharedReportUrl,
  shareExpiryDays,
  type ShareExpiryOption,
} from '../report-share.utils';

type ShareReportDialogProps = {
  reportId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function ShareReportDialog({ reportId, isOpen, onOpenChange }: ShareReportDialogProps) {
  const { t } = useTranslation('smartCheck');
  const validityId = useId();
  const [expiry, setExpiry] = useState<ShareExpiryOption>('7');
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const activeLink = useQuery({ ...smartCheckQueries.shareLink(reportId), enabled: isOpen });
  const createLink = useCreateShareLink();
  const revokeLink = useRevokeShareLink();
  const isBusy = createLink.isPending || revokeLink.isPending;
  const link = activeLink.data ?? null;

  const handleOpenChange = (open: boolean) => {
    if (!open) setCreatedUrl(null);
    onOpenChange(open);
  };

  const handleCreate = () => {
    createLink.mutate(
      { reportId, expiresInDays: shareExpiryDays(expiry) },
      {
        onSuccess: (token) => {
          setCreatedUrl(sharedReportUrl(env.siteUrl, reportId, token));
        },
        onError: () => {
          toast.error(t('report.share.createFailed'));
        },
      },
    );
  };

  const handleRevoke = () => {
    revokeLink.mutate(reportId, {
      onSuccess: () => {
        setCreatedUrl(null);
        toast.success(t('report.share.revoked'));
      },
      onError: () => {
        toast.error(t('report.share.revokeFailed'));
      },
    });
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('report.share.copied'));
    } catch {
      toast.error(t('report.share.copyFailed'));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-5 p-5 w560:p-6 sm:max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-title-xs font-extrabold">
            {t('report.share.title')}
          </DialogTitle>
          <DialogDescription className="text-small text-muted-foreground">
            {t('report.share.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <p id={validityId} className="text-small font-bold text-foreground">
            {t('report.share.validity')}
          </p>
          <ToggleGroup
            type="single"
            value={expiry}
            onValueChange={(value) => {
              if (isShareExpiryOption(value)) setExpiry(value);
            }}
            aria-labelledby={validityId}
            className="grid w-full grid-cols-3 gap-1 rounded-lg border border-border bg-card p-1"
          >
            {SHARE_EXPIRY_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option}
                value={option}
                className="h-10 rounded-md px-2 text-small font-bold text-foreground hover:bg-surface-alt data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary-hover"
              >
                {t(`report.share.options.${option}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="md"
            className="w-full"
            disabled={isBusy}
            aria-busy={createLink.isPending}
            onClick={handleCreate}
          >
            <LinkIcon aria-hidden />
            {link ? t('report.share.replace') : t('report.share.create')}
          </Button>
          {link && !createdUrl ? (
            <p className="text-caption text-muted-foreground">{t('report.share.replaceNote')}</p>
          ) : null}
        </div>

        {createdUrl ? (
          <div className="flex flex-col gap-2 rounded-lg bg-surface-subtle p-3">
            <p className="text-small font-bold text-foreground">{t('report.share.newLink')}</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={createdUrl}
                aria-label={t('report.share.newLink')}
                onFocus={(event) => {
                  event.currentTarget.select();
                }}
                className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2.5 font-mono text-caption text-foreground"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                aria-label={t('report.share.copy')}
                onClick={() => void handleCopy(createdUrl)}
              >
                <CopyIcon aria-hidden />
              </Button>
            </div>
            <p className="text-caption text-muted-foreground">{t('report.share.newLinkNote')}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          {activeLink.isError ? (
            <p className="text-small text-destructive">{t('report.share.loadFailed')}</p>
          ) : link ? (
            <div className="flex items-center gap-3 rounded-lg bg-surface-subtle p-3">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <strong className="text-small font-bold text-foreground">
                  {t('report.share.active')}
                </strong>
                <span className="text-caption text-muted-foreground">
                  {t('report.share.createdOn', { date: formatDate(link.created_at) })} ·{' '}
                  {link.expires_at === null
                    ? t('report.share.noExpiry')
                    : t('report.share.expiresOn', { date: formatDate(link.expires_at) })}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isBusy}
                aria-busy={revokeLink.isPending}
                onClick={handleRevoke}
              >
                {t('report.share.revoke')}
              </Button>
            </div>
          ) : activeLink.isPending ? null : (
            <p className="text-small text-muted-foreground">{t('report.share.none')}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
