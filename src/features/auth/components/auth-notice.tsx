import {
  CircleCheckIcon,
  CircleXIcon,
  InfoIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type NoticeTone = NonNullable<ComponentProps<typeof Alert>['tone']>;

const TONE_ICONS: Record<NoticeTone, LucideIcon> = {
  neutral: InfoIcon,
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
  error: CircleXIcon,
};

type AuthNoticeProps = {
  tone: NoticeTone;
  title?: string;
  children: ReactNode;
};

export function AuthNotice({ tone, title, children }: AuthNoticeProps) {
  const Icon = TONE_ICONS[tone];

  return (
    <Alert
      tone={tone}
      className={cn(
        'gap-x-3 gap-y-1 px-4 py-3.5 text-body-sm leading-normal *:[svg]:size-5',
        !title && '*:[svg]:row-span-1',
      )}
    >
      <Icon aria-hidden />
      {title ? <AlertTitle className="font-bold">{title}</AlertTitle> : null}
      <AlertDescription className="text-body-sm leading-normal text-foreground">
        {children}
      </AlertDescription>
    </Alert>
  );
}
