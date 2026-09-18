import { supabase, WORD_IMAGES_BUCKET } from './supabase';
import { readFileAsDataURL, uid } from './utils';

/**
 * Word images live in the `word-images` Supabase Storage bucket, one folder per
 * user (`<user_id>/<file>`), which is exactly what the bucket's RLS policies
 * expect. Older words may still carry a `data:` URL from before Storage was
 * wired up — everything here treats those as read-only and leaves them alone.
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/** Downscale + re-encode an image so we never store multi-megabyte originals. */
async function compress(file: File): Promise<Blob> {
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );
    // Only keep the re-encoded version if it actually helped.
    if (blob && blob.size < file.size) return blob;
    return file;
  } catch {
    return file;
  }
}

function extensionFor(blob: Blob, fallbackName: string): string {
  const fromType = blob.type.split('/')[1];
  if (fromType) return fromType.replace('jpeg', 'jpg').replace('svg+xml', 'svg');
  const fromName = fallbackName.split('.').pop();
  return fromName && fromName.length <= 5 ? fromName.toLowerCase() : 'jpg';
}

/**
 * Upload an image for the current user and return a URL to store on the word.
 * Falls back to an inline data URL if Storage isn't available (e.g. the bucket
 * was never created), so image upload keeps working regardless.
 */
export async function uploadWordImage(file: File, userId: string): Promise<string> {
  const blob = await compress(file);
  const path = `${userId}/${uid()}.${extensionFor(blob, file.name)}`;

  const { error } = await supabase.storage
    .from(WORD_IMAGES_BUCKET)
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });

  if (error) {
    console.warn('Storage upload failed, falling back to inline image:', error.message);
    return readFileAsDataURL(file);
  }

  const { data } = supabase.storage.from(WORD_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** True for a URL that points at an object this user owns in our bucket. */
function ownedStoragePath(url: string | null | undefined, userId: string): string | null {
  if (!url || url.startsWith('data:')) return null;
  const marker = `/storage/v1/object/public/${WORD_IMAGES_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const path = decodeURIComponent(url.slice(at + marker.length).split('?')[0]);
  return path.startsWith(`${userId}/`) ? path : null;
}

/**
 * Remove a previously uploaded image when a word stops pointing at it. Only ever
 * touches objects inside the current user's own folder, and silently ignores
 * data URLs, external URLs, and anything still referenced elsewhere.
 */
export async function deleteWordImage(
  url: string | null | undefined,
  userId: string
): Promise<void> {
  const path = ownedStoragePath(url, userId);
  if (!path) return;
  const { error } = await supabase.storage.from(WORD_IMAGES_BUCKET).remove([path]);
  if (error) console.warn('Could not delete old image:', error.message);
}

export function isRemovableImage(url: string | null | undefined, userId: string): boolean {
  return ownedStoragePath(url, userId) !== null;
}
