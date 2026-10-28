import { supabase } from '@/lib/supabase/client';

const LISTING_PHOTOS_BUCKET = 'listing-photos';

export function getListingPhotoUrl(path: string): string {
  return supabase.storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}
