import type { AgendaInspection } from '../inspection.types';
import { useBookingText } from './use-booking-text';

export function useAgendaText(inspection: AgendaInspection) {
  const text = useBookingText();
  return {
    facts: text.factList({
      propertyType: inspection.property_type,
      areaM2: inspection.area_m2,
      floor: inspection.floor,
      buildingFloors: inspection.building_floors,
    }),
    access: text.accessNotes(inspection.access_tags, inspection.access_notes),
  };
}
