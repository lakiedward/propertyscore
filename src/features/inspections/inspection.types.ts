import type { Database, Enums } from '@/lib/supabase/database.types';

export type InspectionStatus = Enums<'inspection_status'>;

export const ACCESS_TAGS = ['intercom', 'parking', 'pet', 'key_at_doorman'] as const;

export type AccessTag = (typeof ACCESS_TAGS)[number];

export const AGENDA_DAYS = ['today', 'tomorrow', 'week'] as const;

export type AgendaDay = (typeof AGENDA_DAYS)[number];

export type AgendaRange = { from: string; to: string };

type AgendaRow = Database['public']['Functions']['inspector_agenda']['Returns'][number];

type NullableAgendaColumn =
  | 'access_name'
  | 'access_phone'
  | 'access_notes'
  | 'area_m2'
  | 'floor'
  | 'building_floors'
  | 'year_built'
  | 'latitude'
  | 'longitude';

export type AgendaInspection = Omit<AgendaRow, NullableAgendaColumn> & {
  [Column in NullableAgendaColumn]: AgendaRow[Column] | null;
};

export const INSPECTION_START_TIMES = [
  '08:00',
  '09:30',
  '11:00',
  '12:30',
  '14:00',
  '15:30',
  '17:00',
] as const;
