/**
 * Sound aggregator for `/sound/[id]` — read-only Path D surface.
 *
 * Resolves `public.sounds` by primary id, or by `licensed_track_id` / `user_sound_id`
 * so links from posts (which may only carry licensed/user ids) still resolve.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BadgeVerificationStatus } from '@/lib/ruehl/accountTypes';
import { normalizePost } from '@/lib/ruehl/posts';
import { getProfile } from '@/lib/ruehl/queries/profile';

function isMissingRelation(err: { message?: string; code?: string } | null): boolean {
  const m = String(err?.message || '').toLowerCase();
  return err?.code === '42P01' || (m.includes('relation') && m.includes('does not exist'));
}

const SOUND_SELECT =
  'id, track_name, artist_name, title, artist, cover_url, preview_url, created_at, usage_count, licensed_track_id, user_sound_id';

export type SoundDetailSound = {
  id: string;
  trackName: string | null;
  artistName: string | null;
  coverUrl: string | null;
  previewUrl: string | null;
  createdAt: string | null;
  /** From DB aggregate when present */
  usageCount: number | null;
};

export type SoundDetailPost = {
  id: string;
  content: string | null;
  media_url: string | null;
  created_at: string | null;
  liftCount: number;
  username: string;
  avatarUrl: string | null;
  badgeStatus: BadgeVerificationStatus;
  legacyVerified: boolean | null;
};

export type SoundDetailPageData = {
  sound: SoundDetailSound;
  posts: SoundDetailPost[];
};

function mapSoundRow(row: Record<string, unknown>): SoundDetailSound {
  const tn = String(row.track_name || row.title || '').trim();
  const an = String(row.artist_name || row.artist || '').trim();
  const usageN = Number(row.usage_count);
  const usageCount = Number.isFinite(usageN) ? Math.max(0, Math.floor(usageN)) : null;

  const rawCover = row.cover_url == null ? '' : String(row.cover_url).trim();

  return {
    id: String(row.id),
    trackName: tn || null,
    artistName: an || null,
    coverUrl: rawCover || null,
    previewUrl: row.preview_url == null ? null : String(row.preview_url),
    createdAt: row.created_at == null ? null : String(row.created_at),
    usageCount,
  };
}

/** Candidate ids from the `sounds` row (generic id + linked licensed / user sound FKs). */
function candidateSoundIdsFromRow(row: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  const id = String(row.id || '').trim();
  if (id) ids.add(id);
  const lt = row.licensed_track_id;
  if (lt != null && String(lt).trim()) ids.add(String(lt).trim());
  const us = row.user_sound_id;
  if (us != null && String(us).trim()) ids.add(String(us).trim());
  return [...ids];
}

/**
 * PostgREST OR: any of the four post FK columns may hold the reference (most licensed posts use
 * `licensed_track_id` with `sound_id` null).
 */
function buildSoundPostOrFilter(candidateIds: string[]): string {
  const ids = [...new Set(candidateIds.map((x) => String(x).trim()).filter(Boolean))];
  if (ids.length === 0) return '';
  const csv = ids.join(',');
  return [
    `sound_id.in.(${csv})`,
    `licensed_track_id.in.(${csv})`,
    `user_sound_id.in.(${csv})`,
    `ruehl_sound_id.in.(${csv})`,
  ].join(',');
}

function dedupePostsByIdNewestFirst(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byId = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const id = String(r.id || '');
    if (!id) continue;
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, r);
      continue;
    }
    const tPrev = new Date(String(prev.created_at || 0)).getTime();
    const tNew = new Date(String(r.created_at || 0)).getTime();
    if (Number.isFinite(tNew) && (!Number.isFinite(tPrev) || tNew >= tPrev)) {
      byId.set(id, r);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime(),
  );
}

async function resolveCoverUrl(
  client: SupabaseClient,
  row: Record<string, unknown>,
  mapped: SoundDetailSound,
): Promise<string | null> {
  const direct = mapped.coverUrl?.trim();
  if (direct) return direct;

  const ltId = row.licensed_track_id;
  if (ltId != null && String(ltId).trim()) {
    const { data, error } = await client
      .from('licensed_tracks')
      .select('artwork_url')
      .eq('id', String(ltId).trim())
      .limit(1);
    if (error) {
      if (!isMissingRelation(error)) throw error;
    } else {
      const url = String((data?.[0] as { artwork_url?: string } | undefined)?.artwork_url || '').trim();
      if (url) return url;
    }
  }

  return null;
}

async function resolveSoundRow(
  client: SupabaseClient,
  routeKey: string,
): Promise<Record<string, unknown> | null> {
  const key = String(routeKey || '').trim();
  if (!key) return null;

  const tryColumn = async (column: 'id' | 'licensed_track_id' | 'user_sound_id') => {
    const { data, error } = await client.from('sounds').select(SOUND_SELECT).eq(column, key).limit(1);
    if (error) throw error;
    const row = data?.[0];
    return (row as Record<string, unknown> | undefined) ?? null;
  };

  let row = await tryColumn('id');
  if (row) return row;

  row = await tryColumn('licensed_track_id');
  if (row) return row;

  row = await tryColumn('user_sound_id');
  return row;
}

async function fetchPostsUsingSound(
  client: SupabaseClient,
  candidateIds: string[],
): Promise<SoundDetailPost[]> {
  if (candidateIds.length === 0) return [];

  const cols = 'id, user_id, content, media_url, created_at, lifts_count';
  const orFilter = buildSoundPostOrFilter(candidateIds);
  let rows: Record<string, unknown>[] = [];

  const vp = await client
    .from('visible_posts')
    .select(cols)
    .or(orFilter)
    .order('created_at', { ascending: false })
    .limit(20);

  if (vp.error) {
    if (isMissingRelation(vp.error)) {
      const p = await client
        .from('posts')
        .select(cols)
        .or(orFilter)
        .order('created_at', { ascending: false })
        .limit(20);
      if (p.error) throw p.error;
      rows = dedupePostsByIdNewestFirst((p.data || []) as Record<string, unknown>[]);
    } else {
      throw vp.error;
    }
  } else {
    rows = dedupePostsByIdNewestFirst((vp.data || []) as Record<string, unknown>[]);
  }

  const userIds = [...new Set(rows.map((r) => String(r.user_id || '')).filter(Boolean))];
  const profileByUserId = new Map<string, Awaited<ReturnType<typeof getProfile>>>();
  await Promise.all(
    userIds.map(async (uid) => {
      const prof = await getProfile(uid, client);
      profileByUserId.set(uid, prof);
    }),
  );

  return rows.map((r) => {
    const uid = String(r.user_id || '');
    const prof = profileByUserId.get(uid) ?? null;
    const norm = normalizePost(r);
    const un = String(prof?.username || 'user').replace(/^@+/, '');
    return {
      id: String(r.id),
      content: r.content == null ? null : String(r.content),
      media_url: r.media_url == null ? null : String(r.media_url),
      created_at: r.created_at == null ? null : String(r.created_at),
      liftCount: norm.liftCount,
      username: un,
      avatarUrl: prof?.avatar_url ?? null,
      badgeStatus: prof?.badge_verification_status ?? null,
      legacyVerified: prof?.is_verified ?? null,
    };
  });
}

export async function getSoundById(soundRouteKey: string, client: SupabaseClient): Promise<SoundDetailPageData | null> {
  const row = await resolveSoundRow(client, soundRouteKey);
  if (!row?.id) return null;

  const base = mapSoundRow(row);
  const coverUrl = await resolveCoverUrl(client, row, base);
  const sound: SoundDetailSound = { ...base, coverUrl };

  const candidateIds = candidateSoundIdsFromRow(row);
  const posts = await fetchPostsUsingSound(client, candidateIds);

  return { sound, posts };
}
