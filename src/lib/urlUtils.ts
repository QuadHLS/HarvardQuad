/**
 * Normalizes a social URL for safe use: trims, prepends https:// if no protocol,
 * and returns the full URL string only if valid. Returns null for empty/invalid.
 */
export function normalizeSocialUrl(url: string | null | undefined): string | null {
  const s = typeof url === 'string' ? url.trim() : '';
  if (!s) return null;
  const toParse = /^https?:\/\//i.test(s) ? s : 'https://' + s;
  try {
    const u = new URL(toParse);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** True only if the string is a valid http(s) URL we can safely open. */
export function isValidSocialUrl(url: string | null | undefined): boolean {
  return normalizeSocialUrl(url) !== null;
}
