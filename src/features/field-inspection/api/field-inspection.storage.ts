import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';

const BUCKET = 'inspection-media';

const SIGNED_URL_SECONDS = 3600;

export function signaturePath(inspectionId: string) {
  return `${inspectionId}/signature/${crypto.randomUUID()}.png`;
}

export function questionMediaPath(inspectionId: string, extension: string) {
  return `${inspectionId}/question/${crypto.randomUUID()}.${extension}`;
}

export async function uploadInspectionFile(path: string, file: Blob, contentType: string) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType, upsert: false, cacheControl: '31536000' });
  if (error) throw toAppError(error);
}

export async function removeInspectionFile(path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw toAppError(error);
}

export async function signInspectionFiles(paths: readonly string[]) {
  if (paths.length === 0) {
    return {};
  }
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls([...paths], SIGNED_URL_SECONDS);
  if (error) throw toAppError(error);
  return Object.fromEntries(
    data.flatMap((item) => (item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [])),
  );
}
