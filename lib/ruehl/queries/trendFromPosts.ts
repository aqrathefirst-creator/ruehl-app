/**
 * Ported from `ruehl-native/lib/soundTrendsFromPosts.ts` + `creatorSurfacingFromPosts.ts`.
 * Standalone helpers (not under locked `lib/ruehl/types`).
 */

export type SoundTrendBucket<T = unknown> = {
  key: string;
  track: string;
  artist: string;
  usage: number;
  engagement: number;
  trendScore: number;
  representative: T;
};

export function computeSoundTrendBucketsFromPosts<T extends { track_name?: string | null; artist_name?: string | null }>(
  posts: T[],
  getPostScore: (post: T) => number,
): SoundTrendBucket<T>[] {
  const soundsMap: Record<
    string,
    { track: string; artist: string; usage: number; engagement: number; representative: T }
  > = {};

  for (const post of posts) {
    const track = String(post.track_name || '').trim();
    if (!track) continue;
    const artist = String(post.artist_name || '').trim();
    const key = `${track}\0${artist}`;
    const postScore = getPostScore(post);
    if (!soundsMap[key]) {
      soundsMap[key] = { track, artist, usage: 0, engagement: 0, representative: post };
    }
    soundsMap[key].usage += 1;
    soundsMap[key].engagement += postScore;
  }

  return Object.entries(soundsMap)
    .map(([key, s]) => ({
      key,
      track: s.track,
      artist: s.artist,
      usage: s.usage,
      engagement: s.engagement,
      trendScore: s.engagement + s.usage * 5,
      representative: s.representative,
    }))
    .sort((a, b) => b.trendScore - a.trendScore || b.usage - a.usage);
}

export function topSoundTrendBuckets<T>(buckets: SoundTrendBucket<T>[], lim = 10): SoundTrendBucket<T>[] {
  return buckets.slice(0, Math.max(0, lim));
}

export function defaultClientPostTrendScoreForSoundTrend(post: {
  sound_usage_count?: number | null;
  lift_count?: number | null;
  liftCount?: number | null;
  lifts_count?: number | null;
}): number {
  const soundUsage = Math.max(0, Number(post.sound_usage_count ?? 0));
  const lifts = Math.max(
    0,
    Number(post.liftCount ?? post.lift_count ?? post.lifts_count ?? 0),
  );
  return soundUsage + lifts * 3 + 1;
}

export function buildCreatorBoostByUserId<T extends { user_id?: string | null }>(
  posts: T[],
  getPostScore: (post: T) => number,
  maxBoost = 15,
): Record<string, number> {
  const raw: Record<string, number> = {};
  for (const post of posts) {
    const uid = String(post.user_id || '').trim();
    if (!uid) continue;
    raw[uid] = (raw[uid] || 0) + getPostScore(post);
  }
  const out: Record<string, number> = {};
  for (const uid of Object.keys(raw)) {
    let v = Math.sqrt(Math.max(0, raw[uid]));
    v = Math.min(v, maxBoost);
    out[uid] = v;
  }
  return out;
}
