import type { ReactNode } from 'react';

type StatusPageProps = {
  title: string;
  description: string;
  action: ReactNode;
};

export function StatusPage({ title, description, action }: StatusPageProps) {
  return (
    <div className="mx-auto flex min-h-[60svh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
