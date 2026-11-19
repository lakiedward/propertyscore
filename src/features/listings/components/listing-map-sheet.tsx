import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';

type ListingMapSheetProps = {
  label: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function ListingMapSheet({ label, isOpen, onClose, children }: ListingMapSheetProps) {
  return (
    <Dialog.Root
      open={isOpen}
      modal={false}
      onOpenChange={(isNowOpen) => {
        if (!isNowOpen) {
          onClose();
        }
      }}
    >
      <Dialog.Content
        aria-describedby={undefined}
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
        className="fixed inset-x-0 bottom-0 z-220 rounded-t-xl bg-card px-4 pt-4.5 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-map-sheet focus-visible:outline-none"
      >
        <Dialog.Title className="sr-only">{label}</Dialog.Title>
        {children}
      </Dialog.Content>
    </Dialog.Root>
  );
}
