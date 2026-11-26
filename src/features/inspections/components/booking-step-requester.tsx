import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  CheckIcon,
  CircleCheckIcon,
  KeyRoundIcon,
  LogInIcon,
  PlusIcon,
  SearchIcon,
  UserCheckIcon,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { cva } from 'class-variance-authority';
import { useTranslation } from 'react-i18next';
import ownerImage from '@/assets/home/hero-living.webp';
import buyerImage from '@/assets/home/room-living.webp';
import { TilePicker } from '@/components/forms/tile-picker';
import { EmptyState } from '@/components/layout/empty-state';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountIdentity } from '@/features/profile';
import { cn } from '@/lib/utils';
import { inspectionQueries } from '../api/inspections.queries';
import { useBookingStore } from '../booking.store';
import type { BookableProperty } from '../inspection.types';
import { homeChoiceOf, homePrefillOf, isSameChoice } from '../inspection.utils';
import { BookingHomeCard } from './booking-home-card';

const BOOKING_PATH = '/inspection';

const NEW_HOME = 'new';

const newHomeVariants = cva(
  'flex min-h-85 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center text-foreground hover:border-primary hover:bg-step-leaf-soft',
  {
    variants: {
      isSelected: {
        true: 'border-primary bg-step-leaf-soft',
        false: 'border-border-strong bg-card',
      },
    },
  },
);

const roleCardVariants = cva(
  'flex flex-col overflow-hidden rounded-[22px] border-2 bg-card p-0 text-left text-foreground',
  {
    variants: {
      isSelected: {
        true: 'border-primary bg-step-leaf-soft shadow-[0_0_0_3px_var(--color-step-leaf-surface)]',
        false: 'cursor-not-allowed border-border opacity-70',
      },
    },
  },
);

const homeCardVariants = cva(
  'flex flex-col overflow-hidden rounded-xl bg-card text-left text-foreground outline-none hover:border-border-strong hover:shadow-card-hover focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      isSelected: {
        true: 'border-2 border-primary shadow-[0_0_0_3px_var(--color-secondary)]',
        false: 'border border-border',
      },
    },
  },
);

function keepOwner() {
  return undefined;
}

function homeKey(property: BookableProperty): string {
  return property.property_id ?? property.listing_id ?? '';
}

type BookingStepRequesterProps = {
  user: User | null;
  titleId: string;
};

export function BookingStepRequester({ user, titleId }: BookingStepRequesterProps) {
  const { t } = useTranslation('inspections');

  return (
    <>
      <TilePicker
        value="owner"
        onChange={keepOwner}
        labelledBy={titleId}
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-3.5"
        options={[
          {
            value: 'owner',
            className: roleCardVariants({ isSelected: true }),
            content: (
              <RoleCard
                image={ownerImage}
                icon={KeyRoundIcon}
                title={t('booking.requester.owner.title')}
                text={t('booking.requester.owner.text')}
                isSelected
              />
            ),
          },
          {
            value: 'buyer',
            isDisabled: true,
            className: roleCardVariants({ isSelected: false }),
            content: (
              <RoleCard
                image={buyerImage}
                icon={SearchIcon}
                title={t('booking.requester.buyer.title')}
                text={t('booking.requester.buyer.text')}
                badge={t('booking.requester.soon')}
                isSelected={false}
              />
            ),
          },
        ]}
      />
      {user ? (
        <HomePicker user={user} />
      ) : (
        <div className="flex flex-col gap-3.5 rounded-photo border border-card bg-card p-4.5 shadow-card-soft sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-step-leaf-surface text-step-leaf-ink">
              <LogInIcon aria-hidden className="size-5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <strong className="text-title-3xs">{t('booking.requester.signIn.title')}</strong>
              <span className="text-small text-muted-foreground">
                {t('booking.requester.signIn.text')}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild>
              <Link to="/login" search={{ redirect: BOOKING_PATH }}>
                <LogInIcon aria-hidden />
                {t('booking.requester.signIn.login')}
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/sign-up" search={{ redirect: BOOKING_PATH }}>
                {t('booking.requester.signIn.signUp')}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

type RoleCardProps = {
  image: string;
  icon: typeof KeyRoundIcon;
  title: string;
  text: string;
  badge?: string;
  isSelected: boolean;
};

function RoleCard({ image, icon: Icon, title, text, badge, isSelected }: RoleCardProps) {
  return (
    <>
      <span className="relative block">
        <img src={image} alt="" className="block aspect-16/8 w-full object-cover" />
        <span
          aria-hidden
          className={cn(
            'absolute top-2.5 right-2.5 grid size-7.5 place-items-center rounded-full border-2 shadow-booking-chip',
            isSelected ? 'border-primary bg-primary text-cta' : 'border-border-strong bg-card',
          )}
        >
          {isSelected ? <CheckIcon className="size-4" /> : null}
        </span>
        {badge ? (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-card px-3 py-1 text-meta font-extrabold text-brand shadow-booking-check">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="flex items-start gap-3.5 px-5 pt-4.5 pb-5.5">
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-tile',
            isSelected ? 'bg-primary text-cta' : 'bg-step-leaf-surface text-step-leaf-ink',
          )}
        >
          <Icon aria-hidden className="size-6" />
        </span>
        <span className="flex flex-col gap-1">
          <strong className="text-title-2xs tracking-[-0.02em]">{title}</strong>
          <span className="text-body-sm leading-normal text-muted-foreground">{text}</span>
        </span>
      </span>
    </>
  );
}

type HomePickerProps = {
  user: User;
};

function HomePicker({ user }: HomePickerProps) {
  const { t } = useTranslation('inspections');
  const { name } = useAccountIdentity(user);
  const properties = useQuery(inspectionQueries.bookableProperties(user.id));
  const choice = useBookingStore((state) => state.choice);
  const chooseHome = useBookingStore((state) => state.chooseHome);
  const picked = properties.data?.find((property) => isSameChoice(choice, property));
  const isNew = choice?.kind === 'new';

  return (
    <div className="flex flex-col gap-3.5 pt-1.5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <strong className="text-h3">{t('booking.home.title')}</strong>
          <span className="text-small text-muted-foreground">{t('booking.home.text')}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-small text-muted-foreground">
          <UserCheckIcon aria-hidden className="size-4" />
          {t('booking.home.signedInAs', { name })}
        </span>
      </div>
      {properties.isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4">
          <Skeleton className="h-85 rounded-xl" />
          <Skeleton className="h-85 rounded-xl" />
        </div>
      ) : properties.isError ? (
        <EmptyState kind="error" title={t('booking.home.error')} />
      ) : (
        <TilePicker
          value={isNew ? NEW_HOME : picked ? homeKey(picked) : null}
          onChange={(value) => {
            const property = properties.data.find((item) => homeKey(item) === value);
            if (property) {
              chooseHome(homeChoiceOf(property), homePrefillOf(property));
            } else {
              chooseHome({ kind: 'new' }, null);
            }
          }}
          legend={t('booking.home.groupLabel')}
          isLegendHidden
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4"
          options={[
            ...properties.data.map((property) => {
              const isSelected = isSameChoice(choice, property);
              return {
                value: homeKey(property),
                className: homeCardVariants({ isSelected }),
                content: <BookingHomeCard property={property} isSelected={isSelected} />,
              };
            }),
            {
              value: NEW_HOME,
              className: newHomeVariants({ isSelected: isNew }),
              content: (
                <>
                  <span
                    className={cn(
                      'grid size-16 place-items-center rounded-full',
                      isNew ? 'bg-primary text-cta' : 'bg-step-leaf-surface text-step-leaf-ink',
                    )}
                  >
                    <PlusIcon aria-hidden className="size-7.5" />
                  </span>
                  <strong className="text-title-2xs-sm">{t('booking.home.new.title')}</strong>
                  <span className="max-w-60 text-small text-muted-foreground">
                    {t('booking.home.new.text')}
                  </span>
                </>
              ),
            },
          ]}
        />
      )}
      {picked || isNew ? (
        <Alert
          tone="leaf"
          className="px-4 py-3 text-body-sm font-bold has-[>svg]:gap-x-2.5 *:[svg]:translate-y-0"
        >
          <CircleCheckIcon aria-hidden className="size-5" />
          <span>
            {isNew
              ? t('booking.home.picked.new')
              : t('booking.home.picked.existing', { address: picked?.address_text ?? '' })}
          </span>
        </Alert>
      ) : null}
    </div>
  );
}
