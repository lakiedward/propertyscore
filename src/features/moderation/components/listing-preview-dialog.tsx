import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ReviewListing } from '../moderation.types';
import { ListingSummary } from './listing-summary';

type ListingPreviewDialogProps = {
  listing: ReviewListing;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function ListingPreviewDialog({ listing, isOpen, onOpenChange }: ListingPreviewDialogProps) {
  const { t } = useTranslation('moderation');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-y-auto p-0 pb-5.5 sm:max-w-2xl">
        <DialogHeader className="px-5.5 pt-5 pr-14 pb-2">
          <DialogTitle>{t('previewDialog.title')}</DialogTitle>
          <DialogDescription>{t('previewDialog.description')}</DialogDescription>
        </DialogHeader>
        <ListingSummary listing={listing} />
      </DialogContent>
    </Dialog>
  );
}
