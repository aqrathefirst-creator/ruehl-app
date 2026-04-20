/**
 * Post normalization + POWR detection + sound resolution — ported from native `lib/` (pure TS only).
 *
 * Sources:
 * - `ruehl-native/lib/isPowrPost.ts`
 * - `ruehl-native/lib/normalizePost.ts`
 * - `ruehl-native/lib/postSoundResolver.ts`
 *
 * `PostMediaType` aligns with `posts.media_type` CHECK (`20260423_posts_media_type.sql`).
 */

/** From migration `posts_media_type_valid`: image | video; clients prefer column over parsing URLs. */
export type PostMediaType = 'image' | 'video';

export type PowrDetectablePost = {
  media_url?: string | null;
  media_urls?: string[] | null;
  content?: string | null;
};

/** True when the post has a primary media URL or any carousel URL (after trim). */
export const isMediaPost = (post: PowrDetectablePost): boolean => {
  if (!!String(post.media_url || '').trim()) return true;
  const urls = post.media_urls;
  if (!Array.isArray(urls)) return false;
  return urls.some((u) => !!String(u || '').trim());
};

/** Text-based POWR: non-empty trimmed body and no media (single or carousel). */
export const isPowrPost = (post: PowrDetectablePost): boolean =>
  !isMediaPost(post) && !!String(post.content || '').trim();

/**
 * Single engagement surface for UI + ranking: camelCase counts derived once from legacy row fields.
 * Call after media/sound normalization so downstream reads `liftCount` / `listenCount` / `echoCount` only.
 *
 * Ported from `ruehl-native/lib/normalizePost.ts`.
 */
export type NormalizedEngagement = {
  liftCount: number;
  listenCount: number;
  echoCount: number;
};

export function normalizePost<P extends object>(post: P): P & NormalizedEngagement {
  const r = post as Record<string, unknown>;
  return {
    ...post,
    liftCount: Math.max(0, Number(r.lifts_count ?? r.lift_count ?? r.liftCount ?? 0)),
    listenCount: Math.max(0, Number(r.listen_count ?? r.views ?? r.listenCount ?? 0)),
    echoCount: Math.max(0, Number(r.echo_count ?? r.echoCount ?? 0)),
  };
}

/** Resolved soundtrack for display / preview — from `ruehl-native/lib/postSoundResolver.ts`. */
export type ResolvedSound = {
  kind: 'licensed' | 'user_sound';
  id: string;
  previewUrl: string | null;
  trackName: string | null;
  artistName: string | null;
};

/** Subset of `posts` columns used to resolve soundtrack (snake_case as in Supabase). */
export type PostSoundInput = {
  music_source?: string | null;
  licensed_track_id?: string | null;
  user_sound_id?: string | null;
  sound_id?: string | null;
  music_preview_url?: string | null;
  track_name?: string | null;
  artist_name?: string | null;
};

/** Ported from `ruehl-native/lib/postSoundResolver.ts` — pure resolution, no fetching. */
export function resolvePostSound(post: PostSoundInput): ResolvedSound | undefined {
  if (!post) return undefined;

  if (post.music_source === 'licensed' && post.licensed_track_id) {
    return {
      kind: 'licensed',
      id: post.licensed_track_id,
      previewUrl: post.music_preview_url ?? null,
      trackName: post.track_name ?? null,
      artistName: post.artist_name ?? null,
    };
  }

  if (post.music_source === 'user_sound' && post.user_sound_id) {
    return {
      kind: 'user_sound',
      id: post.user_sound_id,
      previewUrl: post.music_preview_url ?? null,
      trackName: post.track_name ?? null,
      artistName: post.artist_name ?? null,
    };
  }

  if (post.sound_id) {
    return {
      kind: 'licensed',
      id: post.sound_id,
      previewUrl: post.music_preview_url ?? null,
      trackName: post.track_name ?? null,
      artistName: post.artist_name ?? null,
    };
  }

  return undefined;
}
