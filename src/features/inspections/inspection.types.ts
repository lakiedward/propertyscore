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

type Functions = Database['public']['Functions'];

type Widened<Row, Column extends keyof Row> = Omit<Row, Column> & {
  [Key in Column]: Row[Key] | null;
};

export type BookableProperty = Widened<
  Functions['my_bookable_properties']['Returns'][number],
  | 'property_id'
  | 'listing_id'
  | 'area_m2'
  | 'building_floors'
  | 'floor'
  | 'last_inspection_at'
  | 'latitude'
  | 'longitude'
  | 'listing_currency'
  | 'listing_price'
  | 'listing_status'
  | 'listing_transaction'
  | 'photo_path'
  | 'rooms'
  | 'year_built'
>;

export type InspectionCity = Functions['inspection_cities']['Returns'][number];

export type SlotCount = Functions['inspection_slots']['Returns'][number];

export type PropertyType = Enums<'listing_property_type'>;

export type AccessMode = Enums<'inspection_access_mode'>;

export type PaymentMethod = Enums<'inspection_payment_method'>;

export type BookingRequest = {
  propertyId: string | null;
  listingId: string | null;
  addressText: string;
  cityId: string;
  latitude: number;
  longitude: number;
  propertyType: PropertyType;
  areaM2: number;
  yearBuilt: number | null;
  floor: number | null;
  buildingFloors: number | null;
  startsAt: string;
  accessMode: AccessMode;
  accessName: string | null;
  accessPhone: string | null;
  accessTags: readonly AccessTag[];
  accessNotes: string | null;
  paymentMethod: PaymentMethod;
};

export type MyInspection = Widened<
  Functions['my_inspections']['Returns'][number],
  | 'access_name'
  | 'access_phone'
  | 'access_notes'
  | 'area_m2'
  | 'floor'
  | 'building_floors'
  | 'inspector_name'
  | 'assigned_at'
  | 'cancelled_at'
>;

export type InspectionEvent = Widened<
  Functions['inspection_history']['Returns'][number],
  'actor_name'
>;

export const APPOINTMENT_MODES = ['details', 'reschedule'] as const;

export type AppointmentMode = (typeof APPOINTMENT_MODES)[number];

export type AdminInspection = Widened<
  Functions['admin_inspections']['Returns'][number],
  | 'access_name'
  | 'access_phone'
  | 'access_notes'
  | 'area_m2'
  | 'floor'
  | 'building_floors'
  | 'inspector_id'
  | 'inspector_name'
  | 'client_name'
  | 'client_phone'
>;

export type AdminInspector = Widened<
  Functions['admin_inspectors']['Returns'][number],
  'full_name' | 'phone'
>;

export const SCHEDULE_TABS = ['calendar', 'availability'] as const;

export const SCHEDULE_VIEWS = ['day', 'week'] as const;

export type ScheduleView = (typeof SCHEDULE_VIEWS)[number];

export type WorkingRange = {
  inspector_id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
};

export type InspectorBlock = {
  inspector_id: string;
  starts_at: string;
  ends_at: string;
};
