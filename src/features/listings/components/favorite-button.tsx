import { useQuery } from '@tanstack/react-query';
import { HeartIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SignInPrompt } from '@/components/feedback/sign-in-prompt';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utils';
import { favoriteQueries, useToggleFavorite } from '../api/favorites.queries';

type FavoriteButtonLook = 'overlay' | 'card' | 'ghost';

const PRESSED_CLASS = 'aria-pressed:text-destructive aria-pressed:[&_svg]:fill-current';

const FACE_ON_PHOTO_CLASS = 'border-0 p-0 hover:bg-transparent aria-expanded:bg-transparent';

const HEART_LOOKS = {
  overlay: {
    shape: 'pill',
    button: FACE_ON_PHOTO_CLASS,
    face: 'size-11 rounded-full bg-card shadow-fav',
    icon: 'size-5 stroke-2',
  },
  card: {
    shape: 'pill',
    button: FACE_ON_PHOTO_CLASS,
    face: 'size-9 rounded-full bg-card/94 shadow-sm',
    icon: 'size-4',
  },
  ghost: {
    shape: 'default',
    button: '',
    face: '',
    icon: 'size-5',
  },
} as const satisfies Record<
  FavoriteButtonLook,
  { shape: 'pill' | 'default'; button: string; face: string; icon: string }
>;

type FavoriteButtonProps = {
  listingId: string;
  title: string;
  look: FavoriteButtonLook;
  className?: string;
};

export function FavoriteButton({ listingId, title, look, className }: FavoriteButtonProps) {
  const { t } = useTranslation('listings');
  const { user, hasRole } = useAuth();

  if (hasRole('admin')) {
    return null;
  }

  if (!user) {
    return (
      <SignInPrompt
        message={t('favorites.signIn.message')}
        trigger={
          <HeartButton look={look} aria-label={t('favorites.signIn.label')} className={className} />
        }
      />
    );
  }

  return (
    <SignedInFavoriteButton
      userId={user.id}
      listingId={listingId}
      title={title}
      look={look}
      className={className}
    />
  );
}

type SignedInFavoriteButtonProps = FavoriteButtonProps & {
  userId: string;
};

function SignedInFavoriteButton({
  userId,
  listingId,
  title,
  look,
  className,
}: SignedInFavoriteButtonProps) {
  const { t } = useTranslation('listings');
  const favoriteIds = useQuery(favoriteQueries.ids(userId));
  const toggleFavorite = useToggleFavorite(userId, listingId, {
    onSuccess: (isSaved) => {
      toast.success(t(isSaved ? 'favorites.added' : 'favorites.removed'));
    },
  });
  const isFavorite = favoriteIds.data?.includes(listingId) ?? false;
  const isBusy = favoriteIds.isPending;

  const handleClick = () => {
    if (!isBusy) {
      toggleFavorite.mutate(!isFavorite);
    }
  };

  return (
    <HeartButton
      look={look}
      aria-label={t('favorites.save', { title })}
      aria-pressed={isFavorite}
      aria-disabled={isBusy || undefined}
      onClick={handleClick}
      className={className}
    />
  );
}

type HeartButtonProps = ComponentProps<'button'> & {
  look: FavoriteButtonLook;
};

function HeartButton({ look, className, ...buttonProps }: HeartButtonProps) {
  const heart = HEART_LOOKS[look];

  return (
    <Button
      {...buttonProps}
      type="button"
      variant="ghost"
      size="icon"
      shape={heart.shape}
      className={cn(PRESSED_CLASS, heart.button, className)}
    >
      <span className={cn('grid place-items-center', heart.face)}>
        <HeartIcon aria-hidden className={heart.icon} />
      </span>
    </Button>
  );
}
