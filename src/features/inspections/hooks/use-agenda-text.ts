import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';
import type { AgendaInspection } from '../inspection.types';
import { knownAccessTags } from '../inspection.utils';

export function useAgendaText(inspection: AgendaInspection) {
  const { t } = useTranslation('inspections');
  const facts = [t(`propertyType.${inspection.property_type}`)];
  if (inspection.area_m2 !== null) {
    facts.push(t('agenda.area', { area: formatNumber(inspection.area_m2) }));
  }
  if (inspection.floor !== null && inspection.building_floors !== null) {
    facts.push(t('agenda.floor', { floor: inspection.floor, floors: inspection.building_floors }));
  }
  const accessParts = knownAccessTags(inspection.access_tags).map((tag) => t(`accessTag.${tag}`));
  if (inspection.access_notes) {
    accessParts.push(inspection.access_notes);
  }
  return { facts, access: accessParts.join('. ') };
}
