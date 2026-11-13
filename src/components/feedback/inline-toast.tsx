import { cva } from 'class-variance-authority';
import { CircleCheckIcon, CircleXIcon } from 'lucide-react';
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
  className?: string;
};

export function InlineToast({ tone, message, className }: InlineToastProps) {
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
      <span>{message}</span>
    </div>
  );
}
