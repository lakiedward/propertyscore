import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { MailIcon, PhoneIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authQueries } from '@/features/auth';

type ListingContactCardProps = {
  ownerId: string;
  email: string | undefined;
};

export function ListingContactCard({ ownerId, email }: ListingContactCardProps) {
  const { t } = useTranslation('myListings');
  const { data: phone } = useQuery(authQueries.accountPhone(ownerId));

  return (
    <dl className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <PhoneIcon aria-hidden className="mt-0.5 size-4.5 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-0.5">
          <dt className="text-label">{t('wizard.contact.phone')}</dt>
          <dd className="text-body-sm text-foreground tabular-nums">
            {phone ?? t('wizard.contact.noPhone')}
          </dd>
          <dd className="text-small text-muted-foreground">
            {t('wizard.contact.phoneHint')}{' '}
            <Link
              to="/account/settings"
              className="font-bold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
            >
              {t('wizard.contact.settings')}
            </Link>
          </dd>
        </div>
      </div>
      {email ? (
        <div className="flex items-start gap-3">
          <MailIcon aria-hidden className="mt-0.5 size-4.5 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-0.5">
            <dt className="text-label">{t('wizard.contact.email')}</dt>
            <dd className="text-body-sm break-all text-foreground">{email}</dd>
          </div>
        </div>
      ) : null}
    </dl>
  );
}
