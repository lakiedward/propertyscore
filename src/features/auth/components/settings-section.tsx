import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SettingsSectionProps = {
  title: string;
  description: string;
  tone?: 'default' | 'danger';
  children: ReactNode;
};

export function SettingsSection({
  title,
  description,
  tone = 'default',
  children,
}: SettingsSectionProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'flex flex-col gap-4 rounded-lg border bg-card p-(--card-padding)',
        tone === 'danger' ? 'border-error-border' : 'border-border-hairline',
      )}
    >
      <div className="flex flex-col gap-1.5">
        <h2 id={titleId} className="text-title-xs leading-heading font-title text-foreground">
          {title}
        </h2>
        <p className="max-w-copy text-body leading-copy text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
