import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { AvailabilityEditor } from './availability-editor';

const route = getRouteApi('/_authenticated/field/availability');

export function MyAvailabilityPage() {
  const { t } = useTranslation('staff');
  const { user } = route.useRouteContext();

  return (
    <AvailabilityEditor
      inspectorId={user.id}
      inspectorName={null}
      description={t('availability.weekly.selfDescription')}
    />
  );
}
