import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ListingPreviewDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
};

export function ListingPreviewDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
}: ListingPreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-y-auto p-0 pb-5.5 sm:max-w-2xl">
        <DialogHeader className="px-5.5 pt-5 pr-14 pb-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
