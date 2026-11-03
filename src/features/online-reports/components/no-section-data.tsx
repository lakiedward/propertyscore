import { CircleDashedIcon } from 'lucide-react';

type NoSectionDataProps = {
  text: string;
};

export function NoSectionData({ text }: NoSectionDataProps) {
  return (
    <p className="flex items-start gap-2.5 rounded-xl border border-dashed border-trust-none-border p-5 text-small text-muted-foreground">
      <CircleDashedIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-data-missing" />
      {text}
    </p>
  );
}
