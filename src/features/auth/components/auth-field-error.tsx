import type { ReactNode } from 'react';

type AuthFieldErrorProps = {
  id: string;
  children: ReactNode;
};

export function AuthFieldError({ id, children }: AuthFieldErrorProps) {
  if (!children) {
    return null;
  }
  return (
    <p id={id} className="text-caption leading-[1.55] text-destructive">
      {children}
    </p>
  );
}
