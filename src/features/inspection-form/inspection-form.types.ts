import type { ConsentSectionsValues } from './inspection-form.schemas';
import { Constants, type Enums } from '@/lib/supabase/database.types';
import type { getConsentEditor } from './api/consent.api';
import type { getFormEditor } from './api/inspection-form.api';

export type RequiredMedia = Enums<'inspection_required_media'>;

export type VersionStatus = Enums<'form_version_status'>;

export type VersionItem = {
  id: string;
  label: string;
  status: VersionStatus;
  publishedAt: string | null;
  archivedAt: string | null;
  updatedAt: string;
  inspectionCount: number;
};

export const REQUIRED_MEDIA = Constants.public.Enums.inspection_required_media;

export const CONTENT_TABS = ['consent', 'form'] as const;

export type FormEditor = Awaited<ReturnType<typeof getFormEditor>>;

export type FormCategory = FormEditor['categories'][number];

export type FormQuestion = FormEditor['questions'][number];

export type FormVersion = NonNullable<FormEditor['shown']>;

export type CategoryInput = { nameRo: string; nameEn: string; icon: string };

export type QuestionPatch = {
  text_ro?: string;
  text_en?: string;
  required_media?: RequiredMedia;
  weight?: number;
};

export type PointsPatch = {
  points_good: number;
  points_acceptable: number;
  points_problem: number;
};

export type ConsentSectionPatch = ConsentSectionsValues['sections'][number];

export type ConsentEditor = Awaited<ReturnType<typeof getConsentEditor>>;
