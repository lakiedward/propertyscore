import { LoaderCircleIcon, UploadIcon } from 'lucide-react';
import { useId, useState, type DragEvent } from 'react';
import { cn } from '@/lib/utils';

type MediaUploadProps = {
  label: string;
  hint: string;
  accept: string;
  onAdd: (files: File[]) => void;
  isMultiple?: boolean;
  isBusy?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
};

function hasFiles(event: DragEvent<HTMLLabelElement>): boolean {
  return event.dataTransfer.types.includes('Files');
}

function isLeavingZone(event: DragEvent<HTMLLabelElement>): boolean {
  const next = event.relatedTarget;
  return !(next instanceof Node && event.currentTarget.contains(next));
}

export function MediaUpload({
  label,
  hint,
  accept,
  onAdd,
  isMultiple = true,
  isBusy = false,
  isDisabled = false,
  isInvalid = false,
}: MediaUploadProps) {
  const hintId = useId();
  const [isOver, setIsOver] = useState(false);
  const isBlocked = isDisabled || isBusy;
  const Icon = isBusy ? LoaderCircleIcon : UploadIcon;

  return (
    <label
      data-over={isOver ? true : undefined}
      data-invalid={isInvalid ? true : undefined}
      aria-disabled={isBlocked ? true : undefined}
      onDragOver={(event) => {
        if (!hasFiles(event)) {
          return;
        }
        event.preventDefault();
        if (!isBlocked) {
          setIsOver(true);
        }
      }}
      onDragLeave={(event) => {
        if (isLeavingZone(event)) {
          setIsOver(false);
        }
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) {
          return;
        }
        event.preventDefault();
        setIsOver(false);
        if (!isBlocked) {
          onAdd([...event.dataTransfer.files]);
        }
      }}
      className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-border-strong bg-background px-5 py-7 text-center transition-colors duration-(--duration-fast) focus-within:ring-3 focus-within:ring-ring focus-within:ring-offset-2 hover:border-primary hover:bg-surface-highlight aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:border-border-strong aria-disabled:hover:bg-background data-invalid:border-destructive data-invalid:bg-error-surface data-over:border-primary data-over:bg-surface-highlight"
    >
      <input
        type="file"
        accept={accept}
        multiple={isMultiple}
        disabled={isBlocked}
        aria-label={label}
        aria-describedby={hintId}
        className="sr-only"
        onChange={(event) => {
          const files = event.target.files ? [...event.target.files] : [];
          event.target.value = '';
          if (files.length > 0) {
            onAdd(files);
          }
        }}
      />
      <Icon aria-hidden className={cn('size-7 text-brand', isBusy && 'animate-spin')} />
      <strong className="text-label font-bold text-foreground">{label}</strong>
      <span id={hintId} className="text-caption text-muted-foreground">
        {hint}
      </span>
    </label>
  );
}
