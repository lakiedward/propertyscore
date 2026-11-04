import type { ReactNode } from 'react';
import { SectionTitle } from './section-title';

type PanelIntroProps = { eyebrow: string; lead: string; accent: string; text: ReactNode };

export function PanelIntro({ eyebrow, lead, accent, text }: PanelIntroProps) {
  return (
    <div className="grid grid-cols-1 items-center gap-x-9.5 gap-y-4 pt-6.25 pb-6 w820:grid-cols-2">
      <div>
        <p className="text-micro leading-normal font-bold tracking-[0.07em] text-ink-soft uppercase">
          {eyebrow}
        </p>
        <SectionTitle
          as="h3"
          size="panel"
          className="mt-2.5 text-foreground"
          accentClassName="text-muted-foreground"
          lead={lead}
          accent={accent}
        />
      </div>
      <p className="max-w-127.5 text-small leading-[1.75] text-muted-foreground">{text}</p>
    </div>
  );
}
