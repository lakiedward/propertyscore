import {
  CircleCheckIcon,
  CircleXIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TOAST_OFFSET = 24;
const TOAST_MOBILE_OFFSET = 16;

function Toaster(props: ToasterProps) {
  const { t } = useTranslation();

  return (
    <Sonner
      theme="light"
      position="bottom-right"
      offset={TOAST_OFFSET}
      mobileOffset={TOAST_MOBILE_OFFSET}
      containerAriaLabel={t('toasts.region')}
      icons={{
        success: <CircleCheckIcon aria-hidden className="size-5 text-success" />,
        info: <InfoIcon aria-hidden className="size-5 text-info" />,
        warning: <TriangleAlertIcon aria-hidden className="size-5 text-warning" />,
        error: <CircleXIcon aria-hidden className="size-5 text-destructive" />,
        loading: <Loader2Icon aria-hidden className="size-5 animate-spin text-brand" />,
      }}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: t('actions.close'),
        classNames: {
          toast:
            'flex w-full items-start gap-3 rounded-lg border border-border bg-card p-4 font-sans text-foreground shadow-md',
          success: 'border-success-border bg-success-surface',
          info: 'border-info-border bg-info-surface',
          warning: 'border-warning-border bg-warning-surface',
          error: 'border-error-border bg-error-surface',
          icon: 'mt-px flex shrink-0 items-center',
          content: 'flex min-w-0 flex-1 flex-col gap-0.5',
          title: 'text-label text-foreground',
          description: 'text-small leading-compact text-muted-foreground',
          actionButton: cn(buttonVariants({ size: 'sm' }), 'shrink-0 self-center'),
          cancelButton: cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'shrink-0 self-center',
          ),
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
