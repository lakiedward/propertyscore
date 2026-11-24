import { Constants, type Database, type Enums } from '@/lib/supabase/database.types';
import type { getProgress, getWorkspace } from './api/field-inspection.api';

export type InspectionAnswer = Enums<'inspection_answer'>;

export const INSPECTION_ANSWERS = Constants.public.Enums.inspection_answer;

export type InspectionMediaKind = Enums<'inspection_media_kind'>;

type WorkspaceRow = Database['public']['Functions']['inspector_workspace']['Returns'][number];

type NullableWorkspaceColumn =
  | 'started_at'
  | 'submitted_at'
  | 'score'
  | 'form_version_id'
  | 'consent_version_id'
  | 'floor'
  | 'building_floors'
  | 'year_built'
  | 'inspector_name';

export type WorkspaceInspection = Omit<WorkspaceRow, NullableWorkspaceColumn> & {
  [Column in NullableWorkspaceColumn]: WorkspaceRow[Column] | null;
};

export type Workspace = Awaited<ReturnType<typeof getWorkspace>>;

export type WorkspaceCategory = Workspace['categories'][number];

export type WorkspaceQuestion = Workspace['questions'][number];

export type WorkspaceAnswer = Workspace['answers'][number];

export type WorkspaceMedia = Workspace['media'][number];

export type Progress = Awaited<ReturnType<typeof getProgress>>;

export type CategoryProgress = Progress['categories'][number];

export const CONSENT_SECTION = 'consent';

export const SIGNER_LANGUAGES = ['ro', 'en'] as const;

export type SignerLanguage = (typeof SIGNER_LANGUAGES)[number];

export const PHOTO_MAX_EDGE = 1920;

export const VIDEO_MAX_BYTES = 52_428_800;

export const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;
