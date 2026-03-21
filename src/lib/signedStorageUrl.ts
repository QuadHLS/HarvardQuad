import { supabase } from '@/lib/supabase';

const SIGNED_URL_EXPIRY = 3600; // 1 hour

/** Extract storage path from full URL or return path as-is. */
export function extractStoragePath(urlOrPath: string, bucketId: string): string | null {
  const match = urlOrPath.match(new RegExp(`${bucketId.replace(/-/g, '\\-')}\\/(.+)$`));
  return match ? match[1] : (urlOrPath.includes('/') && !urlOrPath.startsWith('http') ? urlOrPath : null);
}

/** Create signed URL for private bucket. Returns null on failure. */
export async function getSignedUrl(
  bucket: string,
  urlOrPath: string,
  expiresIn = SIGNED_URL_EXPIRY
): Promise<string | null> {
  const path = extractStoragePath(urlOrPath, bucket) ?? urlOrPath;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Create signed URLs for multiple paths. Returns map of path -> signedUrl. */
export async function getSignedUrls(
  bucket: string,
  urlOrPaths: string[],
  expiresIn = SIGNED_URL_EXPIRY
): Promise<Map<string, string>> {
  const pathToOriginal = new Map<string, string>();
  const paths: string[] = [];
  for (const u of urlOrPaths) {
    const path = extractStoragePath(u, bucket) ?? u;
    if (!pathToOriginal.has(path)) {
      pathToOriginal.set(path, u);
      paths.push(path);
    }
  }
  if (paths.length === 0) return new Map();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresIn);
  const result = new Map<string, string>();
  if (error || !data) return result;
  for (const item of data) {
    if (item.signedUrl && item.path) {
      const orig = pathToOriginal.get(item.path);
      if (orig) result.set(orig, item.signedUrl);
    }
  }
  return result;
}
