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

  return {
    id: String(row.id),
    trackName: tn || null,
    artistName: an || null,
    coverUrl: row.cover_url == null ? null : String(row.cover_url),
    previewUrl: row.preview_url == null ? null : String(row.preview_url),
    createdAt: row.created_at == null ? null : String(row.created_at),
    usageCount,
  };
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

async function fetchPostsUsingSound(client: SupabaseClient, soundId: string): Promise<SoundDetailPost[]> {
  const cols = 'id, user_id, content, media_url, created_at, lifts_count';
  let rows: Record<string, unknown>[] = [];

  const vp = await client
    .from('visible_posts')
    .select(cols)
    .eq('sound_id', soundId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (vp.error) {
    if (isMissingRelation(vp.error)) {
      const p = await client
        .from('posts')
        .select(cols)
        .eq('sound_id', soundId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (p.error) throw p.error;
      rows = (p.data || []) as Record<string, unknown>[];
    } else {
      throw vp.error;
    }
  } else {
    rows = (vp.data || []) as Record<string, unknown>[];
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

  const sound = mapSoundRow(row);
  const posts = await fetchPostsUsingSound(client, sound.id);

  return { sound, posts };
}
