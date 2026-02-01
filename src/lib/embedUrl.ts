/**
 * Detects YouTube, YouTube Shorts, TikTok, and Instagram Reels URLs
 * and returns embed URL + aspect ratio for iframe display.
 * Social iframes use Open Graph ratio 1.91:1 (1200×630) for consistent post previews.
 */

export type EmbedKind = 'youtube' | 'youtube_shorts' | 'tiktok' | 'instagram_reel';

/** Open Graph standard ratio (width/height), e.g. 1200×630 */
const OG_ASPECT_RATIO = 1200 / 630; // 1.904...

export interface EmbedInfo {
  kind: EmbedKind;
  embedUrl: string;
  /** width/height; use OG ratio for social iframes */
  aspectRatio: number;
  originalUrl: string;
}

function tryNormalizeUrl(url: string): string {
  const s = (url || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    return u.href;
  } catch {
    return '';
  }
}

/**
 * YouTube: watch?v=ID, youtu.be/ID
 * YouTube Shorts: youtube.com/shorts/ID
 */
function parseYouTube(url: string): EmbedInfo | null {
  const u = url.toLowerCase();
  let videoId: string | null = null;
  let isShort = false;

  if (u.includes('youtube.com/watch') && u.includes('v=')) {
    const m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m) videoId = m[1];
  } else if (u.includes('youtube.com/shorts/')) {
    const m = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (m) {
      videoId = m[1];
      isShort = true;
    }
  } else if (u.includes('youtu.be/')) {
    const m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (m) videoId = m[1];
    // youtu.be links are often shared for shorts; treat as short for aspect ratio
    isShort = true;
  }

  if (!videoId) return null;
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  return {
    kind: isShort ? 'youtube_shorts' : 'youtube',
    embedUrl,
    aspectRatio: OG_ASPECT_RATIO,
    originalUrl: url,
  };
}

/**
 * TikTok: tiktok.com/@user/video/ID, vm.tiktok.com/xxx (we can't get ID from short links reliably, skip those)
 */
function parseTikTok(url: string): EmbedInfo | null {
  const u = url.toLowerCase();
  if (!u.includes('tiktok.com')) return null;
  // @username/video/1234567890123456789
  const m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (!m) return null;
  const videoId = m[1];
  // TikTok embed: player/v1/VIDEO_ID (per TikTok embed docs)
  const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`;
  return {
    kind: 'tiktok',
    embedUrl,
    aspectRatio: OG_ASPECT_RATIO,
    originalUrl: url,
  };
}

/**
 * Instagram Reels: instagram.com/reel/CODE/
 */
function parseInstagramReel(url: string): EmbedInfo | null {
  const u = url.toLowerCase();
  if (!u.includes('instagram.com/reel/')) return null;
  const m = url.match(/instagram\.com\/reel\/([a-zA-Z0-9_-]+)/i);
  if (!m) return null;
  const code = m[1];
  const embedUrl = `https://www.instagram.com/reel/${code}/embed/`;
  return {
    kind: 'instagram_reel',
    embedUrl,
    aspectRatio: OG_ASPECT_RATIO,
    originalUrl: url,
  };
}

export function getEmbedInfo(url: string | null | undefined): EmbedInfo | null {
  const normalized = tryNormalizeUrl(url || '');
  if (!normalized) return null;
  return (
    parseYouTube(normalized) ??
    parseTikTok(normalized) ??
    parseInstagramReel(normalized) ??
    null
  );
}
