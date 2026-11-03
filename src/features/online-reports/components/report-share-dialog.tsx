import { useQuery } from '@tanstack/react-query';
import { CopyIcon, Share2Icon } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { env } from '@/config/env';
import { formatDate } from '@/i18n/format';
import { oneOf } from '@/lib/utils';
import {
  onlineReportQueries,
  useCreateReportShareLink,
  useRevokeReportShareLink,
} from '../api/online-reports.queries';
import {
  reportShareUrl,
  SHARE_EXPIRIES,
  shareExpiryDays,
  type ShareExpiry,
} from '../online-report.utils';

type ReportShareDialogProps = {
  reportId: string;
};

export function ReportShareDialog({ reportId }: ReportShareDialogProps) {
  const { t } = useTranslation('onlineReports');
  const expiryLabelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<ShareExpiry>('never');
  const activeLink = useQuery({ ...onlineReportQueries.shareLink(reportId), enabled: isOpen });
  const createLink = useCreateReportShareLink();
  const revokeLink = useRevokeReportShareLink();
  const isBusy = createLink.isPending || revokeLink.isPending;
  const url = token === null ? null : reportShareUrl(env.siteUrl, reportId, token);

  const handleCreate = () => {
    createLink.mutate(
      { reportId, expiresInDays: shareExpiryDays(expiry) },
      { onSuccess: setToken },
    );
  };

  const handleRevoke = () => {
    revokeLink.mutate(reportId, {
      onSuccess: () => {
        setToken(null);
        toast.success(t('share.revoked'));
      },
    });
  };

  const handleCopy = async () => {
    if (url === null) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('share.copied'));
    } catch {
      toast.error(t('share.copyFailed'));
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setToken(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="inverseInfo" size="sm" shape="pill">
          <Share2Icon aria-hidden />
          {t('share.open')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('share.title')}</DialogTitle>
          <DialogDescription>{t('share.description')}</DialogDescription>
        </DialogHeader>
        {url !== null ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input
                readOnly
                value={url}
                aria-label={t('share.linkLabel')}
                onFocus={(event) => {
                  event.currentTarget.select();
                }}
              />
              <Button
                onClick={() => {
                  void handleCopy();
                }}
              >
                <CopyIcon aria-hidden />
                {t('share.copy')}
              </Button>
            </div>
            <p className="text-small text-muted-foreground">{t('share.onlyOnce')}</p>
            <div>
              <Button variant="outline" size="sm" disabled={isBusy} onClick={handleRevoke}>
                {t('share.revoke')}
              </Button>
            </div>
          </div>
        ) : activeLink.isPending ? (
          <p className="text-small text-muted-foreground">{t('share.loading')}</p>
        ) : activeLink.data ? (
          <div className="flex flex-col gap-3">
            <p className="text-small">
              {activeLink.data.expires_at === null
                ? t('share.active', { date: formatDate(activeLink.data.created_at) })
                : t('share.activeUntil', {
                    date: formatDate(activeLink.data.created_at),
                    until: formatDate(activeLink.data.expires_at),
                  })}
            </p>
            <p className="text-small text-muted-foreground">{t('share.lostLink')}</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={isBusy} onClick={handleCreate}>
                {t('share.renew')}
              </Button>
              <Button variant="outline" disabled={isBusy} onClick={handleRevoke}>
                {t('share.revoke')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p id={expiryLabelId} className="text-small font-bold">
                {t('share.expiryLabel')}
              </p>
              <ToggleGroup
                type="single"
                size="sm"
                value={expiry}
                onValueChange={(value) => {
                  const next = oneOf(SHARE_EXPIRIES, value);
                  if (next) setExpiry(next);
                }}
                aria-labelledby={expiryLabelId}
                className="gap-1 rounded-full border border-border bg-surface-sunken p-1"
              >
                {SHARE_EXPIRIES.map((option) => (
                  <ToggleGroupItem
                    key={option}
                    value={option}
                    className="h-8 rounded-full px-3 text-caption font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {t(`share.expiry.${option}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div>
              <Button disabled={isBusy} onClick={handleCreate}>
                {t('share.create')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
