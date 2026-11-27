import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';

type CreateDraftEmptyStateProps = {
  title: string;
  description: string;
  actionLabel: string;
  isPending: boolean;
  onCreate: () => void;
};

export function CreateDraftEmptyState({
  title,
  description,
  actionLabel,
  isPending,
  onCreate,
}: CreateDraftEmptyStateProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        <Button type="button" size="md" disabled={isPending} onClick={onCreate}>
          {actionLabel}
        </Button>
      }
    />
  );
}
