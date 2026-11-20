import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import { cva } from 'class-variance-authority';
import { HeartIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utils';
import { favoriteQueries, useToggleFavorite } from '../api/favorites.queries';

const favoriteButtonVariants = cva(
  'size-11 border-0 bg-transparent p-0 text-brand hover:bg-transparent disabled:border-transparent disabled:bg-transparent disabled:text-brand aria-pressed:text-destructive aria-pressed:[&_svg]:fill-current',
  {
    variants: {
      look: {
        overlay: 'rounded-full',
        card: 'rounded-full',
        ghost: 'rounded-md',
      },
    },
  },
);

const heartFaceVariants = cva('grid place-items-center', {
  variants: {
    look: {
      overlay: 'size-11 rounded-full bg-card shadow-fav',
      card: 'size-9 rounded-full bg-card/94 shadow-sm',
      ghost: 'size-11 rounded-md group-hover/button:bg-accent',
    },
  },
});

const heartIconVariants = cva('', {
  variants: {
    look: {
      overlay: 'size-5 stroke-2',
      card: 'size-4',
      ghost: 'size-5',
    },
  },
});

type FavoriteButtonLook = 'overlay' | 'card' | 'ghost';

type FavoriteButtonProps = {
  listingId: string;
  title: string;
  look: FavoriteButtonLook;
  className?: string;
};

export function FavoriteButton({ listingId, title, look, className }: FavoriteButtonProps) {
  const { user, hasRole } = useAuth();

  if (hasRole('admin')) {
    return null;
  }

  return user ? (
    <SignedInFavoriteButton
      userId={user.id}
      listingId={listingId}
      title={title}
      look={look}
      className={className}
    />
  ) : (
    <SignedOutFavoriteButton look={look} className={className} />
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
  const toggleFavorite = useToggleFavorite(userId);
  const isFavorite = favoriteIds.data?.includes(listingId) ?? false;

  const handleClick = () => {
    const shouldSave = !isFavorite;
    toggleFavorite.mutate(
      { listingId, isFavorite: shouldSave },
      {
        onSuccess: () => {
          toast.success(t(shouldSave ? 'favorites.added' : 'favorites.removed'));
        },
      },
    );
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={isFavorite}
      aria-label={t(isFavorite ? 'favorites.remove' : 'favorites.add', { title })}
      disabled={!favoriteIds.isSuccess}
      onClick={handleClick}
      className={cn(favoriteButtonVariants({ look }), className)}
    >
      <HeartFace look={look} />
    </Button>
  );
}

type SignedOutFavoriteButtonProps = {
  look: FavoriteButtonLook;
  className?: string;
};

function SignedOutFavoriteButton({ look, className }: SignedOutFavoriteButtonProps) {
  const { t } = useTranslation('listings');
  const redirect = useLocation({ select: (location) => location.href });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('favorites.signIn.label')}
          className={cn(favoriteButtonVariants({ look }), className)}
        >
          <HeartFace look={look} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-3 p-4">
        <p className="text-small text-foreground">{t('favorites.signIn.message')}</p>
        <Button asChild size="sm">
          <Link to="/login" search={{ redirect }}>
            {t('favorites.signIn.action')}
          </Link>
        </Button>
      </PopoverContent>
    </Popover>
  );
}

type HeartFaceProps = {
  look: FavoriteButtonLook;
};

function HeartFace({ look }: HeartFaceProps) {
  return (
    <span className={heartFaceVariants({ look })}>
      <HeartIcon aria-hidden className={heartIconVariants({ look })} />
    </span>
  );
}
