import type { ReactNode } from 'react';

type AuthPageHeadingProps = {
  title: string;
  children?: ReactNode;
};

export function AuthPageHeading({ title, children }: AuthPageHeadingProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-[clamp(28px,2.6vw,38px)] leading-[1.1] font-title tracking-title text-foreground">
        {title}
      </h2>
      {children ? <p className="text-body text-muted-foreground">{children}</p> : null}
    </div>
  );
}
