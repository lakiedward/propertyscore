import { useEffect, useRef, type ReactNode } from 'react';

type AuthStatusCardProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function AuthStatusCard({ eyebrow, title, children, actions }: AuthStatusCardProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-3.5 rounded-status border border-border bg-card p-7">
      <p className="inline-flex items-center gap-2.25 text-meta leading-copy font-display tracking-eyebrow text-brand uppercase">
        <span aria-hidden="true" className="size-2 rounded-full bg-current" />
        {eyebrow}
      </p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="rounded-sm text-title-sm leading-[1.1] font-title tracking-title text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
      >
        {title}
      </h2>
      {children}
      {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
    </div>
  );
}
