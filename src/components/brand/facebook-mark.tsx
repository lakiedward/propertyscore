import { cn } from '@/lib/utils';

type FacebookMarkProps = {
  className?: string;
};

export function FacebookMark({ className }: FacebookMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn('size-5 shrink-0 fill-current', className)}
    >
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21z" />
    </svg>
  );
}
