import { cva } from 'class-variance-authority';
import { KeyRoundIcon, PhoneIcon, UserIcon } from 'lucide-react';
import type { AgendaInspection } from '../inspection.types';
import { phoneHref } from '../inspection.utils';

const listVariants = cva('flex flex-col gap-2.5 text-small', {
  variants: {
    tone: {
      light: 'rounded-lg bg-background p-3.5',
      inverse: 'text-on-inverse-muted',
    },
  },
});

const iconVariants = cva('mt-0.5 size-4 shrink-0', {
  variants: {
    tone: {
      light: 'text-brand',
      inverse: 'text-trust-physical-mark',
    },
  },
});

const phoneVariants = cva(
  'inline-flex items-center gap-1.5 font-bold tabular-nums underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-offset-2',
  {
    variants: {
      tone: {
        light: 'text-brand focus-visible:ring-ring',
        inverse:
          'text-on-inverse focus-visible:ring-focus-inverse focus-visible:ring-offset-surface-inverse',
      },
    },
  },
);

type AgendaContactProps = {
  inspection: AgendaInspection;
  access: string;
  tone: 'light' | 'inverse';
};

export function AgendaContact({ inspection, access, tone }: AgendaContactProps) {
  const hasPerson = [inspection.access_name, inspection.access_phone].some(Boolean);
  if (!hasPerson && !access) {
    return null;
  }

  return (
    <ul className={listVariants({ tone })}>
      {hasPerson ? (
        <li className="flex flex-wrap items-start gap-x-3 gap-y-1">
          <span className="flex min-w-0 items-start gap-2">
            <UserIcon aria-hidden className={iconVariants({ tone })} />
            {inspection.access_name}
          </span>
          {inspection.access_phone ? (
            <a href={phoneHref(inspection.access_phone)} className={phoneVariants({ tone })}>
              <PhoneIcon aria-hidden className="size-3.5" />
              {inspection.access_phone}
            </a>
          ) : null}
        </li>
      ) : null}
      {access ? (
        <li className="flex items-start gap-2">
          <KeyRoundIcon aria-hidden className={iconVariants({ tone })} />
          {access}
        </li>
      ) : null}
    </ul>
  );
}
