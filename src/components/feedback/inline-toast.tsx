import { cva } from 'class-variance-authority';
import { CircleCheckIcon, CircleXIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const inlineToastIconVariants = cva('size-5 shrink-0', {
  variants: {
    tone: {
      success: 'text-cta',
      error: 'text-error-border',
    },
  },
});

type InlineToastProps = {
  tone: 'success' | 'error';
  message: string;
  action?: { label: string; onAction: () => void };
  className?: string;
};

export function InlineToast({ tone, message, action, className }: InlineToastProps) {
  const Icon = tone === 'error' ? CircleXIcon : CircleCheckIcon;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-center gap-3 rounded-lg bg-foreground py-3 pr-3 pl-4 text-body-sm leading-copy text-on-inverse shadow-lg',
        className,
      )}
    >
      <Icon aria-hidden className={inlineToastIconVariants({ tone })} />
      <span className="flex-1">{message}</span>
      {action ? (
        <Button
          type="button"
          variant="link"
          onClick={action.onAction}
          className="touch-target rounded-md px-2 py-1 text-body-sm leading-copy font-bold text-cta underline hover:text-cta focus-visible:ring-focus-inverse focus-visible:ring-offset-0"
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
