import type { ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type AppointmentSheetProps = {
  title: string;
  description: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
};

export function AppointmentSheet({
  title,
  description,
  onClose,
  className,
  children,
}: AppointmentSheetProps) {
  return (
    <Sheet
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <SheetContent side="right" className={cn('gap-0 overflow-y-auto p-0', className)}>
        <SheetHeader className="border-b border-border-subtle px-5 py-4">
          <SheetTitle className="text-h4 first-letter:uppercase">{title}</SheetTitle>
          <SheetDescription className="sr-only">{description}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4.5 p-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
