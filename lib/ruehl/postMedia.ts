/**
 * Post media render hints — ported from `ruehl-native/lib/postMedia.ts` (pure TS).
 */

export function isVideoMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  const path = url.trim().split(/[?#]/)[0] ?? '';
  return /\.(mp4|mov|m4v|webm|m3u8|3gp|mkv|avi)$/i.test(path);
}

export function inferStoredMediaTypeFromUrl(url?: string | null): 'image' | 'video' {
  if (!url) return 'image';
  return isVideoMediaUrl(url) ? 'video' : 'image';
}

export function normalizePostRowMediaType<T extends { media_type?: string | null; media_url?: string | null }>(
  post: T,
): T {
  return {
    ...post,
    media_type: (post.media_type || inferStoredMediaTypeFromUrl(post.media_url)) as T['media_type'],
  };
}

function looksLikeImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const path = url.trim().split(/[?#]/)[0] ?? '';
  return /\.(jpg|jpeg|png|gif|webp|bmp|heic|heif|avif)$/i.test(path);
}

export function postMediaIsVideo(post: {
  media_type?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
}): boolean {
  const media = String(post.media_url || '').trim();
  if (!media) return false;

  if (looksLikeImageUrl(media)) return false;
  if (isVideoMediaUrl(media)) return true;

  const mt = String(post.media_type || '').trim().toLowerCase();
  if (mt === 'image') return false;
  if (mt === 'video') return true;

  const thumb = String(post.thumbnail_url || '').trim();
  if (thumb && thumb !== media && looksLikeImageUrl(thumb) && !looksLikeImageUrl(media)) {
    return true;
  }

  return false;
}

/** Collect displayable media URLs from `media_urls` / `media_url` (JSON array string or array). */
export function parseMediaUrlCandidates(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean);
        }
      } catch {
        return [];
      }
    }
    return [trimmed];
  }
  return [];
}

export function primaryMediaUrls(post: {
  media_urls?: unknown;
  media_url?: unknown;
}): string[] {
  const fromList = parseMediaUrlCandidates(post.media_urls);
  const fromSingle = parseMediaUrlCandidates(post.media_url);
  return [...fromList, ...fromSingle].filter(Boolean);
}

export function getPostMediaRenderKind(post: {
  media_type?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
}): 'image' | 'video' {
  const media = String(post.media_url || '').trim();
  const mt = String(post.media_type || '').trim().toLowerCase();
  if (mt === 'image') return 'image';
  if (looksLikeImageUrl(media)) return 'image';
  if (mt === 'video') return 'video';
  if (postMediaIsVideo(post)) return 'video';
  return 'image';
}
